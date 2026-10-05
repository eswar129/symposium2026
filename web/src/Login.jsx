import { useEffect, useState } from 'react'
import { api } from './api.js'

export default function Login({ onStart }) {
  const [team, setTeam] = useState('')
  const [code, setCode] = useState('')
  const [started, setStarted] = useState(false)
  const [err, setErr] = useState('')

  useEffect(() => {
    const load = () => api.get('/api/exam/status').then((r) => setStarted(r.started)).catch(() => {})
    load()
    const t = setInterval(load, 3000)
    return () => clearInterval(t)
  }, [])

  const start = async () => {
    if (!team.trim() || !code.trim()) return setErr('Enter team name and exam code')
    try { await document.documentElement.requestFullscreen() } catch { /* ignore */ }
    const r = await api
      .post('/api/exam/join', { team: team.trim(), code: code.trim() })
      .catch(() => ({ ok: false, reason: 'Cannot reach server' }))
    if (!r.ok) {
      setErr(r.reason)
      if (document.fullscreenElement) document.exitFullscreen().catch(() => {})
      return
    }
    onStart(team.trim(), r.examId)
  }

  return (
    <div className="center">
      <h1>Web Development Competition</h1>
      <ul className="rules">
        <li>Duration: 60 minutes. The timer starts when you press Start.</li>
        <li>The exam runs in fullscreen.</li>
        <li>Alt+Tab, Win key, Esc or switching tabs locks the screen. The invigilator password is needed to continue.</li>
        <li>You can open other tabs only after you submit.</li>
      </ul>
      <p>{started ? 'The exam is open. Enter the code from the invigilator.' : 'Waiting for the admin to start the exam…'}</p>
      <input placeholder="Team name or ID" value={team} onChange={(e) => setTeam(e.target.value)} />
      <input placeholder="Exam code" value={code} onChange={(e) => setCode(e.target.value)} />
      <button onClick={start} disabled={!started}>Start exam</button>
      <p className="err">{err}</p>
    </div>
  )
}