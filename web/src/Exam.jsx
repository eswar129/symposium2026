import { useEffect, useRef, useState } from 'react'
import { api } from './api.js'
import { startSecurity } from './security/examSecurity.js'
import LockScreen from './LockScreen.jsx'
import './Exam.css'

const DURATION = 60 * 60 * 1000
const fmt = (ms) => {
  const s = Math.max(0, Math.floor(ms / 1000))
  return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0')
}

export default function Exam({ team, examId, onDone }) {
  const [questions, setQuestions] = useState([])
  const [left, setLeft] = useState(DURATION)
  const [locked, setLocked] = useState(false)
  const [sure, setSure] = useState(false)
  const [tab, setTab] = useState('html')
  const [code, setCode] = useState(
    () => JSON.parse(localStorage.getItem('code:' + team) || 'null') || { html: '<h1>Hello</h1>', css: '', js: '' }
  )
  const lockedRef = useRef(false)
  const stopRef = useRef(() => {})
  const codeRef = useRef(code)

  useEffect(() => {
    codeRef.current = code
    localStorage.setItem('code:' + team, JSON.stringify(code))
  }, [code, team])

  const submit = async () => {
    stopRef.current()
    await api.post('/api/submit', { team, ...codeRef.current }).catch(() => {})
    if (document.fullscreenElement) await document.exitFullscreen().catch(() => {})
    onDone()
  }

  useEffect(() => {
    // Timer survives refresh: end time is stored per team
    const key = 'endAt:' + team + ':' + examId
    let end = Number(localStorage.getItem(key))
    if (!end) { end = Date.now() + DURATION; localStorage.setItem(key, String(end)) }

    api.get('/api/questions').then(setQuestions).catch(() => {})

    stopRef.current = startSecurity((type) => {
      if (lockedRef.current) return
      lockedRef.current = true
      setLocked(true)
      api.post('/api/violation', { team, type }).catch(() => {})
    })

    const timer = setInterval(() => {
      const l = end - Date.now()
      setLeft(l)
      if (l <= 0) submit()
    }, 1000)

    return () => { clearInterval(timer); stopRef.current() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const unlock = async () => {
    lockedRef.current = false
    setLocked(false)
    try { await document.documentElement.requestFullscreen() } catch { /* ignore */ }
  }

  const preview = `<style>${code.css}</style>${code.html}<script>${code.js}<\/script>`

  return (
    <div className="exam">
      <header>
        <b>{team}</b>
        <span className={left < 5 * 60 * 1000 ? 'timer warn' : 'timer'}>{fmt(left)}</span>
        <button className="submit" onClick={() => (sure ? submit() : setSure(true))}>
          {sure ? 'Click again to confirm' : 'Submit'}
        </button>
      </header>

      <aside>
        {questions.map((q) => (
          <section key={q.id}>
            <h3>{q.title}</h3>
            <p>{q.description}</p>
          </section>
        ))}
      </aside>

      <div className="editor">
        <nav>
          {['html', 'css', 'js'].map((t) => (
            <button key={t} className={tab === t ? 'on' : ''} onClick={() => setTab(t)}>{t.toUpperCase()}</button>
          ))}
        </nav>
        <textarea
          spellCheck={false}
          value={code[tab]}
          onChange={(e) => setCode({ ...code, [tab]: e.target.value })}
        />
      </div>

      <iframe title="preview" sandbox="allow-scripts" srcDoc={preview} />

      {locked && <LockScreen onUnlock={unlock} />}
    </div>
  )
}