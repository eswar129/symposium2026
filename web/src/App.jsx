import { useState } from 'react'
import Login from './Login.jsx'
import Exam from './Exam.jsx'
import Admin from './Admin.jsx'
import './App.css'

export default function App() {
  const [team, setTeam] = useState('')
  const [examId, setExamId] = useState(null)
  const [stage, setStage] = useState('login')

  if (location.hash === '#/admin') return <Admin />
  if (stage === 'login')
    return <Login onStart={(t, id) => { setTeam(t); setExamId(id); setStage('exam') }} />
  if (stage === 'exam') return <Exam team={team} examId={examId} onDone={() => setStage('done')} />
  return (
    <div className="center">
      <h1>Submitted</h1>
      <p>Thank you, {team}. You can now close this window.</p>
    </div>
  )
}