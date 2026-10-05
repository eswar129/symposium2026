const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const fs = require('fs');

const app = express();
app.use(cors());
app.use(express.json({ limit: '2mb' }));
app.use(express.static(path.join(__dirname, 'public')));

const DURATION = 60 * 60 * 1000;
const DATA = path.join(__dirname, 'data');
const VIOLATIONS = path.join(DATA, 'violations.json');
const SUBMISSIONS = path.join(DATA, 'submissions');
const EXAM_FILE = path.join(DATA, 'exam.json');
const TEAMS_FILE = path.join(DATA, 'teams.json');
const ENV_FILE = path.join(__dirname, '.env');
fs.mkdirSync(SUBMISSIONS, { recursive: true });
if (!fs.existsSync(VIOLATIONS)) fs.writeFileSync(VIOLATIONS, '[]');
if (!fs.existsSync(TEAMS_FILE)) fs.writeFileSync(TEAMS_FILE, '[]');

const readJson = (f) => JSON.parse(fs.readFileSync(f, 'utf8'));

/* ---------- admin password ---------- */
const clean = (s) => String(s || '').trim();
const isAdmin = (pw) => clean(pw) !== '' && clean(pw) === clean(process.env.ADMIN_PASSWORD);

console.log('Admin password set:', Boolean(clean(process.env.ADMIN_PASSWORD)), '| length:', clean(process.env.ADMIN_PASSWORD).length);

function savePassword(pw) {
  let env = fs.existsSync(ENV_FILE) ? fs.readFileSync(ENV_FILE, 'utf8') : '';
  env = env.split(/\r?\n/).filter((l) => l.trim() && !l.startsWith('ADMIN_PASSWORD=')).join('\n');
  fs.writeFileSync(ENV_FILE, 'ADMIN_PASSWORD="' + pw + '"\n' + env + '\n');
  process.env.ADMIN_PASSWORD = pw;
}

app.get('/api/admin/configured', (req, res) => res.json({ configured: Boolean(clean(process.env.ADMIN_PASSWORD)) }));

app.post('/api/unlock', (req, res) => {
  const pw = clean(req.body.password);
  if (!clean(process.env.ADMIN_PASSWORD)) {
    // first time: only from the server PC (localhost)
    const local = ['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(req.socket.remoteAddress);
    if (!local || !/^[^"\\\r\n]{4,}$/.test(pw)) return res.json({ ok: false });
    savePassword(pw);
    console.log('Admin password saved to .env');
    return res.json({ ok: true });
  }
  const ok = isAdmin(pw);
  console.log('Login attempt: typed length', pw.length, '| expected length', clean(process.env.ADMIN_PASSWORD).length, '|', ok ? 'OK' : 'WRONG');
  res.json({ ok });
});

/* ---------- exam state ---------- */
let exam = fs.existsSync(EXAM_FILE) ? readJson(EXAM_FILE) : { started: false, code: null, id: null };
const saveExam = () => fs.writeFileSync(EXAM_FILE, JSON.stringify(exam));

let teams = readJson(TEAMS_FILE);
const saveTeams = () => fs.writeFileSync(TEAMS_FILE, JSON.stringify(teams, null, 2));

app.get('/api/questions', (req, res) => res.json(readJson(path.join(DATA, 'questions.json'))));

app.get('/api/exam/status', (req, res) =>
  res.json({ started: exam.started, code: isAdmin(req.query.password) ? exam.code : undefined })
);

app.post('/api/exam/start', (req, res) => {
  if (!isAdmin(req.body.password)) return res.status(401).json({ ok: false });
  exam = { started: true, code: String(crypto.randomInt(100000, 1000000)), id: Date.now() };
  saveExam();
  res.json({ ok: true, code: exam.code });
});

app.post('/api/exam/stop', (req, res) => {
  if (!isAdmin(req.body.password)) return res.status(401).json({ ok: false });
  exam = { started: false, code: null, id: null };
  saveExam();
  res.json({ ok: true });
});

app.post('/api/exam/join', (req, res) => {
  if (!exam.started) return res.json({ ok: false, reason: 'Exam has not started yet' });
  if (String(req.body.code) !== exam.code) return res.json({ ok: false, reason: 'Wrong exam code' });
  const team = String(req.body.team || '').trim().slice(0, 60);
  if (!team) return res.json({ ok: false, reason: 'Team name required' });

  let t = teams.find((x) => x.team === team && x.examId === exam.id);
  if (t && t.submittedAt) return res.json({ ok: false, reason: 'This team has already submitted' });
  if (!t) {
    t = { team, examId: exam.id, startedAt: Date.now(), submittedAt: null, status: 'in-progress' };
    teams.push(t);
    saveTeams();
  }
  res.json({ ok: true, examId: exam.id, startedAt: t.startedAt, serverNow: Date.now() });
});

app.post('/api/submit', (req, res) => {
  const { team, examId, html, css, js, password } = req.body;
  const t = teams.find((x) => x.team === team && x.examId === examId);
  if (!t) return res.json({ ok: false, reason: 'Team not found' });
  if (t.submittedAt) return res.json({ ok: true });

  const admin = isAdmin(password);
  const timeUp = Date.now() >= t.startedAt + DURATION - 5000;
  if (!timeUp && !admin) return res.json({ ok: false, reason: 'Wrong password' });

  t.submittedAt = Date.now();
  t.status = admin ? 'submitted' : 'time-up';
  saveTeams();

  const name = String(team).replace(/[^a-z0-9_-]/gi, '_') + '_' + examId;
  fs.writeFileSync(
    path.join(SUBMISSIONS, name + '.json'),
    JSON.stringify({ team, html, css, js, time: new Date().toISOString() }, null, 2)
  );
  res.json({ ok: true });
});

app.get('/api/teams', (req, res) => {
  if (!isAdmin(req.query.password)) return res.status(401).json([]);
  const latest = Math.max(0, ...teams.map((t) => t.examId));
  res.json(teams.filter((t) => t.examId === latest));
});

app.get('/api/submission', (req, res) => {
  if (!isAdmin(req.query.password)) return res.status(401).json({ ok: false });
  const name = String(req.query.team).replace(/[^a-z0-9_-]/gi, '_') + '_' + Number(req.query.examId);
  const file = path.join(SUBMISSIONS, name + '.json');
  if (!fs.existsSync(file)) return res.json({ ok: false });
  res.json({ ok: true, ...readJson(file) });
});

app.post('/api/violation', (req, res) => {
  const list = readJson(VIOLATIONS);
  list.push({ team: String(req.body.team || '?'), type: String(req.body.type || '?'), time: new Date().toISOString() });
  fs.writeFileSync(VIOLATIONS, JSON.stringify(list, null, 2));
  res.json({ ok: true });
});

app.get('/api/violations', (req, res) => {
  if (!isAdmin(req.query.password)) return res.status(401).json([]);
  res.json(readJson(VIOLATIONS).reverse());
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log('Open http://localhost:' + PORT));