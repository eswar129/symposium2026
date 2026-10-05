import { useState } from 'react'
import { api } from './api.js'

export default function LockScreen({ onUnlock }) {
  const [pw, setPw] = useState('')
  const [err, setErr] = useState('')

  const submit = async () => {
    try {
      const r = await api.post('/api/unlock', { password: pw })
      if (r.ok) onUnlock()
      else { setErr('Wrong password'); setPw('') }
    } catch {
      setErr('Cannot reach server')
    }
  }

  return (
    <div className="lock">
      <h2>Exam locked</h2>
      <p>A restricted action was detected. Ask the invigilator to enter the password.</p>
      <input
        type="password"
        autoFocus
        value={pw}
        onChange={(e) => setPw(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && submit()}
        placeholder="Invigilator password"
      />
      <button onClick={submit}>Unlock</button>
      <p className="err">{err}</p>
    </div>
  )
}