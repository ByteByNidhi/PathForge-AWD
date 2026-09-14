import { useEffect, useMemo, useState } from 'react'
import Button from '../components/ui/Button.jsx'
import Card from '../components/ui/Card.jsx'
import EmptyState from '../components/ui/EmptyState.jsx'
import ErrorState from '../components/ui/ErrorState.jsx'
import LoadingState from '../components/ui/LoadingState.jsx'
import PageHeader from '../components/ui/PageHeader.jsx'
import Select from '../components/ui/Select.jsx'
import { getApiError } from '../services/api.js'
import { assignMySkills, fetchMySkills, fetchSkills, removeMySkill } from '../services/skillService.js'

function SkillsPage() {
  const [status, setStatus] = useState('loading')
  const [error, setError] = useState('')
  const [mine, setMine] = useState([])
  const [catalogue, setCatalogue] = useState([])
  const [selectedId, setSelectedId] = useState('')
  const [saving, setSaving] = useState(false)

  const available = useMemo(() => {
    const owned = new Set(mine.map((skill) => skill._id))
    return catalogue.filter((skill) => !owned.has(skill._id))
  }, [mine, catalogue])

  const load = async (quiet = false) => {
    if (!quiet) {
      setStatus('loading')
    }
    setError('')
    try {
      const [mineData, catalogueData] = await Promise.all([fetchMySkills(), fetchSkills()])
      setMine(mineData.skills || [])
      setCatalogue(catalogueData.skills || [])
      setStatus('success')
    } catch (err) {
      setError(getApiError(err, 'Unable to load skills'))
      setStatus((current) => (current === 'loading' ? 'error' : current))
    }
  }

  useEffect(() => {
    load()
  }, [])

  const addSkill = async (event) => {
    event.preventDefault()
    if (!selectedId) return
    setSaving(true)
    setError('')
    try {
      await assignMySkills([selectedId])
      setSelectedId('')
      await load(true)
    } catch (err) {
      setError(getApiError(err, 'Unable to add skill'))
      setStatus('success')
    } finally {
      setSaving(false)
    }
  }

  const removeSkill = async (skillId) => {
    setSaving(true)
    setError('')
    try {
      await removeMySkill(skillId)
      setMine((current) => current.filter((skill) => skill._id !== skillId))
    } catch (err) {
      setError(getApiError(err, 'Unable to remove skill'))
    } finally {
      setSaving(false)
    }
  }

  if (status === 'loading') {
    return <LoadingState title="Loading skills" message="Fetching your catalogue skills." />
  }

  if (status === 'error' && !mine.length && !catalogue.length) {
    return <ErrorState message={error} onRetry={load} />
  }

  return (
    <div>
      <PageHeader
        eyebrow="My Skills"
        title="Skill catalogue"
        description="Add or remove skills from the PathForge catalogue. Custom skill names are not created here."
      />

      {error ? <div className="pf-form-alert" style={{ marginBottom: '1rem' }}>{error}</div> : null}

      <Card style={{ padding: '1.5rem', marginBottom: '1.25rem' }}>
        <form className="skills-toolbar" onSubmit={addSkill}>
          <Select
            id="skillId"
            label="Add a catalogue skill"
            value={selectedId}
            onChange={(event) => setSelectedId(event.target.value)}
          >
            <option value="">Select a skill</option>
            {available.map((skill) => (
              <option key={skill._id} value={skill._id}>
                {skill.name}
              </option>
            ))}
          </Select>
          <Button type="submit" disabled={saving || !selectedId}>
            {saving ? 'Saving…' : 'Add skill'}
          </Button>
        </form>
      </Card>

      {mine.length === 0 ? (
        <EmptyState
          title="No skills assigned"
          message="Beginners can stay at zero. When you are ready, add skills from the catalogue above."
        />
      ) : (
        <Card style={{ padding: '1.5rem' }}>
          <div className="skills-list">
            {mine.map((skill) => (
              <span key={skill._id} className="skill-pill">
                {skill.name}
                <button type="button" onClick={() => removeSkill(skill._id)} aria-label={`Remove ${skill.name}`}>
                  ×
                </button>
              </span>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}

export default SkillsPage
