import { useEffect, useState } from 'react'
import { api } from './api.js'

export default function Admin() {
  const [pw, setPw] = useState('')
  const [ok, setOk] = useState(false)
  const [rows, setRows] = useState([])
  const [exam, setExam] = useState({ started: false })

  const q = encodeURIComponent(pw)

  const login = async () => {
    const r = await api.post('/api/unlock', { password: pw }).catch(() => ({ ok: false }))
    setOk(r.ok)
  }

  const load = () => {
    api.get('/api/violations?password=' + q).then(setRows).catch(() => {})
    api.get('/api/exam/status?password=' + q).then(setExam).catch(() => {})
  }

  useEffect(() => {
    if (!ok) return
    load()
    const t = setInterval(load, 3000)
    return () => clearInterval(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ok])

  const startExam = () => api.post('/api/exam/start', { password: pw }).then(load)
  const stopExam = () => api.post('/api/exam/stop', { password: pw }).then(load)

  if (!ok) {
    return (
      <div className="center">
        <h1>Admin</h1>
        <input type="password" value={pw} onChange={(e) => setPw(e.target.value)} placeholder="Admin password" />
        <button onClick={login}>Open dashboard</button>
      </div>
    )
  }

  return (
    <div className="admin">
      <h1>Exam control</h1>
      {exam.started ? (
        <>
          <p>Status: running</p>
          <p>Exam code: <b style={{ fontSize: '2rem', letterSpacing: '0.2em' }}>{exam.code}</b></p>
          <button onClick={stopExam}>Stop exam</button>
        </>
      ) : (
        <>
          <p>Status: not started</p>
          <button onClick={startExam}>Start exam</button>
        </>
      )}

      <h2>Violations ({rows.length})</h2>
      <table>
        <thead><tr><th>Team</th><th>Type</th><th>Time</th></tr></thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}><td>{r.team}</td><td>{r.type}</td><td>{new Date(r.time).toLocaleTimeString()}</td></tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}