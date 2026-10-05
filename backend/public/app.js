const $ = (id) => document.getElementById(id)
const DURATION = 60 * 60 * 1000

let team = '', examId = null, locked = false
let stopSecurity = () => {}
let timerId = null

async function api(path, body) {
  const opts = body
    ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
    : undefined
  const r = await fetch(path, opts)
  return r.json()
}

function show(id) {
  document.querySelectorAll('.screen').forEach((s) => (s.hidden = s.id !== id))
}

const fmt = (ms) => {
  const s = Math.max(0, Math.floor(ms / 1000))
  return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0')
}

/* ---------- security: detect switching ---------- */
function startSecurity(onViolation) {
  const onVisibility = () => document.hidden && onViolation('tab-switch')
  const onBlur = () => onViolation('window-blur')
  const onFullscreen = () => !document.fullscreenElement && onViolation('fullscreen-exit')
  const onKey = (e) => {
    const k = e.key
    if (k === 'Meta' || k === 'Escape' || (e.altKey && k === 'Tab')) {
      e.preventDefault()
      onViolation('key:' + (e.altKey ? 'Alt+' : '') + k)
    }
    const devtools =
      k === 'F12' ||
      (e.ctrlKey && e.shiftKey && ['I', 'J', 'C'].includes(k.toUpperCase())) ||
      (e.ctrlKey && k.toLowerCase() === 'u')
    if (devtools) e.preventDefault()
  }
  const noMenu = (e) => e.preventDefault()
  const beforeUnload = (e) => { e.preventDefault(); e.returnValue = '' }

  document.addEventListener('visibilitychange', onVisibility)
  window.addEventListener('blur', onBlur)
  document.addEventListener('fullscreenchange', onFullscreen)
  window.addEventListener('keydown', onKey, true)
  document.addEventListener('contextmenu', noMenu)
  window.addEventListener('beforeunload', beforeUnload)
  if (navigator.keyboard && navigator.keyboard.lock) navigator.keyboard.lock(['Escape']).catch(() => {})

  return () => {
    document.removeEventListener('visibilitychange', onVisibility)
    window.removeEventListener('blur', onBlur)
    document.removeEventListener('fullscreenchange', onFullscreen)
    window.removeEventListener('keydown', onKey, true)
    document.removeEventListener('contextmenu', noMenu)
    window.removeEventListener('beforeunload', beforeUnload)
    if (navigator.keyboard && navigator.keyboard.unlock) navigator.keyboard.unlock()
  }
}

/* ---------- login screen ---------- */
async function checkStatus() {
  try {
    const r = await api('/api/exam/status')
    $('status').textContent = r.started
      ? 'The exam is open. Enter the code from the invigilator.'
      : 'Waiting for the admin to start the exam…'
    $('startBtn').disabled = !r.started
  } catch { /* ignore */ }
}
checkStatus()
const poll = setInterval(checkStatus, 3000)

$('startBtn').onclick = async () => {
  team = $('team').value.trim()
  const code = $('code').value.trim()
  if (!team || !code) return ($('err').textContent = 'Enter team name and exam code')
  try { await document.documentElement.requestFullscreen() } catch { /* ignore */ }
  const r = await api('/api/exam/join', { team, code }).catch(() => ({ ok: false, reason: 'Cannot reach server' }))
  if (!r.ok) {
    $('err').textContent = r.reason
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {})
    return
  }
  clearInterval(poll)
  examId = r.examId
  // convert server start time to this PC's clock
  const offset = Date.now() - r.serverNow
  startExam(r.startedAt + DURATION + offset)
}

/* ---------- exam screen ---------- */
const getCode = () => ({ html: $('html').value, css: $('css').value, js: $('js').value })
const codeKey = () => 'code:' + team + ':' + examId

function render() {
  const c = getCode()
  localStorage.setItem(codeKey(), JSON.stringify(c))
  $('preview').srcdoc = '<style>' + c.css + '</style>' + c.html + '<script>' + c.js + '<\/script>'
}

document.querySelectorAll('.editor nav button').forEach((b) => {
  b.onclick = () => {
    document.querySelectorAll('.editor nav button').forEach((x) => x.classList.toggle('on', x === b))
    ;['html', 'css', 'js'].forEach((id) => ($(id).hidden = id !== b.dataset.tab))
  }
})
;['html', 'css', 'js'].forEach((id) => ($(id).oninput = render))

function startExam(end) {
  show('exam')
  $('teamName').textContent = team

  const saved = JSON.parse(localStorage.getItem(codeKey()) || 'null')
  if (saved) { $('html').value = saved.html; $('css').value = saved.css; $('js').value = saved.js }
  render()

  api('/api/questions').then((qs) => {
    $('questions').innerHTML = qs.map((q) => '<section><h3>' + q.title + '</h3><p>' + q.description + '</p></section>').join('')
  })

  stopSecurity = startSecurity((type) => {
    if (locked) return
    locked = true
    $('lock').hidden = false
    $('pw').focus()
    api('/api/violation', { team, type }).catch(() => {})
  })

  timerId = setInterval(() => {
    const left = end - Date.now()
    $('timer').textContent = fmt(left)
    $('timer').classList.toggle('warn', left < 5 * 60 * 1000)
    if (left <= 0) finalize('') // time up: auto-submit, no password needed
  }, 1000)
}

/* ---------- unlock (after Alt+Tab etc.) ---------- */
async function unlock() {
  const r = await api('/api/unlock', { password: $('pw').value }).catch(() => ({ ok: false }))
  if (!r.ok) {
    $('lockErr').textContent = 'Wrong password'
    $('pw').value = ''
    return
  }
  $('pw').value = ''
  $('lockErr').textContent = ''
  locked = false
  $('lock').hidden = true
  try { await document.documentElement.requestFullscreen() } catch { /* ignore */ }
}
$('unlockBtn').onclick = unlock
$('pw').addEventListener('keydown', (e) => { if (e.key === 'Enter') unlock() })

/* ---------- submit (needs admin password) ---------- */
async function finalize(password) {
  const r = await api('/api/submit', { team, examId, password, ...getCode() }).catch(() => ({
    ok: false,
    reason: 'Cannot reach server',
  }))
  if (!r.ok) return r
  clearInterval(timerId)
  stopSecurity()
  if (document.fullscreenElement) await document.exitFullscreen().catch(() => {})
  $('doneTeam').textContent = team
  show('done')
  return r
}

$('submitBtn').onclick = () => {
  $('submitModal').hidden = false
  $('spw').focus()
}

$('cancelSubmit').onclick = () => {
  $('submitModal').hidden = true
  $('spw').value = ''
  $('submitErr').textContent = ''
}

async function confirmSubmit() {
  const r = await finalize($('spw').value)
  if (!r.ok) {
    $('submitErr').textContent = r.reason
    $('spw').value = ''
  }
}
$('confirmSubmit').onclick = confirmSubmit
$('spw').addEventListener('keydown', (e) => { if (e.key === 'Enter') confirmSubmit() })