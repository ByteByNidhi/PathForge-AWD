import { useEffect, useState } from 'react'
import Card from '../components/ui/Card.jsx'
import ErrorState from '../components/ui/ErrorState.jsx'
import LoadingState from '../components/ui/LoadingState.jsx'
import PageHeader from '../components/ui/PageHeader.jsx'
import SkillManager from '../components/skills/SkillManager.jsx'
import { getApiError } from '../services/api.js'
import { assignMySkills, fetchMySkills, fetchSkills, removeMySkill } from '../services/skillService.js'

function SkillsPage() {
  const [status, setStatus] = useState('loading')
  const [error, setError] = useState('')
  const [mine, setMine] = useState([])
  const [catalogue, setCatalogue] = useState([])
  const [saving, setSaving] = useState(false)

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

  const addCatalogue = async (skillId) => {
    setSaving(true)
    setError('')
    try {
      await assignMySkills([skillId])
      await load(true)
    } catch (err) {
      setError(getApiError(err, 'Unable to add skill'))
      setStatus('success')
    } finally {
      setSaving(false)
    }
  }

  const addCustom = async (name) => {
    setSaving(true)
    setError('')
    try {
      await assignMySkills(undefined, name)
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
    return <LoadingState title="Loading skills" message="Fetching your skills." />
  }

  if (status === 'error' && !mine.length && !catalogue.length) {
    return <ErrorState message={error} onRetry={load} />
  }

  return (
    <div>
      <PageHeader
        eyebrow="My Skills"
        title="Skills on your path"
        description="Add catalogue skills or type a custom skill. Custom names are stored as real skills you can remove later."
      />

      <Card>
        <SkillManager
          mine={mine}
          catalogue={catalogue}
          saving={saving}
          error={error}
          onAddCatalogue={addCatalogue}
          onAddCustom={addCustom}
          onRemove={removeSkill}
        />
      </Card>
    </div>
  )
}

export default SkillsPage
