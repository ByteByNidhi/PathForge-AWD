import { useMemo, useState } from 'react'
import Button from '../ui/Button.jsx'
import EmptyState from '../ui/EmptyState.jsx'
import Input from '../ui/Input.jsx'
import Select from '../ui/Select.jsx'
import {
  findSkillByNormalizedName,
  skillId,
  validateSkillName,
} from '../../utils/skillName.js'

function SkillManager({
  mine = [],
  catalogue = [],
  saving = false,
  error = '',
  onAddCatalogue,
  onAddCustom,
  onRemove,
  compact = false,
}) {
  const [selectedId, setSelectedId] = useState('')
  const [customName, setCustomName] = useState('')
  const [localError, setLocalError] = useState('')

  const available = useMemo(() => {
    const owned = new Set(mine.map((skill) => skillId(skill)))
    return catalogue.filter((skill) => !owned.has(skillId(skill)))
  }, [mine, catalogue])

  const submitCatalogue = async (event) => {
    event.preventDefault()
    if (!selectedId) return
    setLocalError('')
    await onAddCatalogue(selectedId)
    setSelectedId('')
  }

  const submitCustom = async (event) => {
    event.preventDefault()
    const nameError = validateSkillName(customName)
    if (nameError) {
      setLocalError(nameError)
      return
    }

    const catalogueMatch = findSkillByNormalizedName(catalogue, customName)
    if (catalogueMatch) {
      const owned = mine.some((skill) => skillId(skill) === skillId(catalogueMatch))
      if (owned) {
        setLocalError('You already have this skill.')
        setCustomName('')
        return
      }
      setLocalError('')
      await onAddCatalogue(skillId(catalogueMatch))
      setCustomName('')
      return
    }

    const ownedMatch = findSkillByNormalizedName(mine, customName)
    if (ownedMatch) {
      setLocalError('You already have this skill.')
      setCustomName('')
      return
    }

    setLocalError('')
    await onAddCustom(customName.trim())
    setCustomName('')
  }

  return (
    <div className={`skill-manager ${compact ? 'skill-manager--compact' : ''}`.trim()}>
      {error || localError ? <div className="pf-form-alert">{error || localError}</div> : null}

      <form className="skill-manager__row" onSubmit={submitCatalogue}>
        <Select
          id="catalogue-skill"
          label="Catalogue skill"
          value={selectedId}
          onChange={(event) => setSelectedId(event.target.value)}
        >
          <option value="">Select a skill</option>
          {available.map((skill) => (
            <option key={skillId(skill)} value={skillId(skill)}>
              {skill.name}
            </option>
          ))}
        </Select>
        <Button type="submit" disabled={saving || !selectedId}>
          Add
        </Button>
      </form>

      <form className="skill-manager__row" onSubmit={submitCustom}>
        <Input
          id="custom-skill"
          label="Add a skill not listed"
          placeholder="Type a skill not listed, then add"
          value={customName}
          onChange={(event) => {
            setCustomName(event.target.value)
            setLocalError('')
          }}
        />
        <Button type="submit" variant="secondary" disabled={saving}>
          Add skill
        </Button>
      </form>

      {mine.length === 0 ? (
        <EmptyState
          title="No skills assigned"
          message="Choose a catalogue skill or type a custom skill name. Beginners can stay at zero."
        />
      ) : (
        <div className="skills-list">
          {mine.map((skill) => (
            <span key={skillId(skill)} className="skill-pill">
              {skill.name}
              {onRemove ? (
                <button
                  type="button"
                  onClick={() => onRemove(skillId(skill))}
                  aria-label={`Remove ${skill.name}`}
                  disabled={saving}
                >
                  ×
                </button>
              ) : null}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

export default SkillManager
