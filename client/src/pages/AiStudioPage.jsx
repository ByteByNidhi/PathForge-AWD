import { useEffect, useRef, useState } from 'react'
import Button from '../components/ui/Button.jsx'
import Card from '../components/ui/Card.jsx'
import ErrorState from '../components/ui/ErrorState.jsx'
import LoadingState from '../components/ui/LoadingState.jsx'
import PageHeader from '../components/ui/PageHeader.jsx'
import Textarea from '../components/ui/Textarea.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { getApiError } from '../services/api.js'
import { fetchAiStudio, sendAiStudioMessage } from '../services/aiStudioService.js'

const STARTERS = [
  { label: 'What should I learn next?', prompt: 'What should I learn next?' },
  { label: 'How can I improve my skills?', prompt: 'How can I improve my skills?' },
  { label: 'What projects should I build?', prompt: 'What projects should I build?' },
  { label: 'Review my progress', prompt: 'Review my current progress.' },
  { label: 'What skills am I missing?', prompt: 'What skills am I missing?' },
  { label: 'Internship prep', prompt: 'Help me prepare for an internship.' },
]

function AiStudioPage() {
  const { user } = useAuth()
  const [status, setStatus] = useState('loading')
  const [error, setError] = useState('')
  const [context, setContext] = useState(null)
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [formStatus, setFormStatus] = useState('')
  const [messages, setMessages] = useState([])
  const logRef = useRef(null)

  const load = async () => {
    setStatus('loading')
    setError('')
    try {
      const data = await fetchAiStudio()
      setContext(data.context)
      setMessages([
        {
          role: 'assistant',
          text: `Hi ${data.context?.name || user?.name || 'there'}. Ask a career question, or tap a starter prompt above. I will use your PathForge path, skills, and progress to answer.`,
        },
      ])
      setStatus('success')
    } catch (err) {
      setError(getApiError(err, 'Unable to load AI Studio'))
      setStatus('error')
    }
  }

  useEffect(() => {
    load()
  }, [])

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight
    }
  }, [messages])

  const onSubmit = async (event) => {
    event.preventDefault()
    const text = message.trim()
    if (!text) {
      setFormStatus('Please enter a question.')
      return
    }

    setSending(true)
    setFormStatus('Thinking…')
    setMessage('')
    setMessages((current) => [...current, { role: 'user', text }])

    try {
      const data = await sendAiStudioMessage(text)
      setMessages((current) => [...current, { role: 'assistant', text: data.reply }])
      setFormStatus('')
    } catch (err) {
      setMessages((current) => [
        ...current,
        {
          role: 'error',
          text: getApiError(err, 'The career assistant could not answer right now. Please try again.'),
        },
      ])
      setFormStatus('')
    } finally {
      setSending(false)
    }
  }

  if (status === 'loading') {
    return <LoadingState title="Loading AI Studio" message="Preparing your career assistant." />
  }

  if (status === 'error') {
    return <ErrorState message={error} onRetry={load} />
  }

  return (
    <div>
      <PageHeader
        eyebrow="Assistant"
        title="AI Studio"
        description="Ask PathForge’s career assistant about your next skills, projects, internships, and roadmap progress. Answers use your saved PathForge profile — not data typed into the chat as identity."
      />

      <div className="pf-studio">
        <Card>
          <dl className="pf-studio__meta">
            <dt>User</dt>
            <dd>
              {context?.name} · Level {context?.level ?? 1} · {context?.xp ?? 0} XP
            </dd>
            <dt>Career path</dt>
            <dd>{context?.pathName || 'No roadmap selected yet'}</dd>
            <dt>Skills</dt>
            <dd>{context?.skillNames?.length ? context.skillNames.join(', ') : 'None added yet'}</dd>
          </dl>
          <div className="pf-chip-grid" aria-label="Starter questions">
            {STARTERS.map((item) => (
              <button
                key={item.prompt}
                type="button"
                className="pf-chip"
                onClick={() => setMessage(item.prompt)}
              >
                {item.label}
              </button>
            ))}
          </div>
        </Card>

        <Card>
          <div className="pf-studio__log" ref={logRef} role="log" aria-live="polite">
            {messages.map((item, index) => (
              <div
                key={`${item.role}-${index}`}
                className={`pf-studio__msg pf-studio__msg--${item.role}`}
              >
                <strong>
                  {item.role === 'user' ? 'You' : 'AI Studio'}
                </strong>
                <p>{item.text}</p>
              </div>
            ))}
          </div>
          <form onSubmit={onSubmit}>
            <Textarea
              id="ai-message"
              label="Your question"
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              maxLength={2000}
              required
              placeholder="Ask about skills, projects, internships, or your roadmap..."
              rows={4}
            />
            <div className="org-actions">
              <Button type="submit" disabled={sending}>
                {sending ? 'Sending…' : 'Send'}
              </Button>
            </div>
            {formStatus ? <p className="pf-muted" style={{ marginTop: '0.75rem' }}>{formStatus}</p> : null}
          </form>
        </Card>
      </div>
    </div>
  )
}

export default AiStudioPage
