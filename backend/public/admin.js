const $ = (id) => document.getElementById(id)
const DURATION = 60 * 60 * 1000
let pw = ''
let current = null

async function api(path, body) {
  const opts = body
    ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
    : undefined
  const r = await fetch(path, opts)
  return r.json()
}

/* ---------- login (first time: typed password becomes the admin password) ---------- */
fetch('/api/admin/configured')
  .then((r) => r.json())
  .then((r) => {
    if (!r.configured) {
      $('hint').hidden = false
      $('loginBtn').textContent = 'Set password & open dashboard'
    }
  })
  .catch(() => {})

$('loginBtn').onclick = async () => {
  pw = $('pw').value
  let r
  try { r = await api('/api/unlock', { password: pw }) }
  catch { return ($('err').textContent = 'Cannot reach backend. Is npm start running?') }
  if (!r.ok) {
    return ($('err').textContent = $('hint').hidden
      ? 'Wrong password. Check backend/.env'
      : 'Use at least 4 characters, no quotes. Open this page on the server PC (localhost).')
  }
  $('login').hidden = true
  $('panel').hidden = false
  load()
  setInterval(load, 3000)
}
$('pw').addEventListener('keydown', (e) => { if (e.key === 'Enter') $('loginBtn').click() })

const fmtTime = (ms) => (ms ? new Date(ms).toLocaleTimeString() : '-')
const fmtDur = (ms) => Math.floor(ms / 60000) + 'm ' + (Math.floor(ms / 1000) % 60) + 's'

function statusOf(t) {
  if (t.submittedAt) return t.status === 'time-up' ? 'Time up (auto-submitted)' : 'Submitted'
  if (Date.now() > t.startedAt + DURATION) return 'Time over, not submitted'
  return 'In progress'
}

function fill(tbodyId, rows, clicks) {
  const body = $(tbodyId)
  body.innerHTML = ''
  rows.forEach((cells, i) => {
    const tr = document.createElement('tr')
    if (clicks && clicks[i]) {
      tr.className = 'clickable'
      tr.onclick = clicks[i]
    }
    cells.forEach((v) => {
      const td = document.createElement('td')
      td.textContent = v
      tr.appendChild(td)
    })
    body.appendChild(tr)
  })
}

async function load() {
  const q = encodeURIComponent(pw)
  const [violations, exam, teams] = await Promise.all([
    api('/api/violations?password=' + q),
    api('/api/exam/status?password=' + q),
    api('/api/teams?password=' + q),
  ])

  $('state').textContent = exam.started ? 'running' : 'not started'
  $('codeRow').hidden = !exam.started
  $('code').textContent = exam.code || ''
  $('startBtn').hidden = exam.started
  $('stopBtn').hidden = !exam.started

  const done = teams.filter((t) => t.submittedAt).length
  $('nJoined').textContent = teams.length
  $('nDone').textContent = done
  $('nRun').textContent = teams.length - done

  const vCount = {}
  violations.forEach((v) => (vCount[v.team] = (vCount[v.team] || 0) + 1))

  fill(
    'teamRows',
    teams.map((t) => [
      t.team,
      fmtTime(t.startedAt),
      fmtTime(t.submittedAt),
      t.submittedAt ? fmtDur(t.submittedAt - t.startedAt) : '-',
      statusOf(t),
      vCount[t.team] || 0,
    ]),
    teams.map((t) => (t.submittedAt ? () => openViewer(t) : null))
  )

  $('count').textContent = violations.length
  fill('rows', violations.map((r) => [r.team, r.type, new Date(r.time).toLocaleTimeString()]))
}

/* ---------- submitted work viewer ---------- */
function showCode(tab) {
  document.querySelectorAll('#viewer nav button').forEach((b) => b.classList.toggle('on', b.dataset.v === tab))
  $('codeView').textContent = current ? current[tab] : ''
}

document.querySelectorAll('#viewer nav button').forEach((b) => {
  b.onclick = () => showCode(b.dataset.v)
})

async function openViewer(t) {
  const url = '/api/submission?password=' + encodeURIComponent(pw) + '&team=' + encodeURIComponent(t.team) + '&examId=' + t.examId
  const s = await api(url).catch(() => ({ ok: false }))
  if (!s.ok) return alert('No submission found for ' + t.team)
  current = s
  $('viewTitle').textContent = s.team
  showCode('html')
  $('viewPreview').srcdoc = '<style>' + s.css + '</style>' + s.html + '<script>' + s.js + '<\/script>'
  $('viewer').hidden = false
}

$('closeViewer').onclick = () => {
  $('viewer').hidden = true
  $('viewPreview').srcdoc = ''
}

$('startBtn').onclick = () => api('/api/exam/start', { password: pw }).then(load)
$('stopBtn').onclick = () => api('/api/exam/stop', { password: pw }).then(load)