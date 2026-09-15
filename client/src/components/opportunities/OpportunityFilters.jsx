import Select from '../ui/Select.jsx'
import {
  OPPORTUNITY_TYPES,
  SORT_OPTIONS,
  STATUS_OPTIONS,
} from '../../utils/opportunity.js'

function OpportunityFilters({
  types = OPPORTUNITY_TYPES,
  locations = [],
  skillOptions = [],
  selectedType,
  selectedLocation,
  selectedSkill,
  selectedStatus,
  sort,
  onChange,
}) {
  const typeOptions = types.length ? types : OPPORTUNITY_TYPES

  return (
    <div className="opportunity-filters">
      <div className="opportunity-filters__types" role="group" aria-label="Opportunity type">
        <button
          type="button"
          className={`pf-chip ${selectedType ? '' : 'is-selected'}`.trim()}
          onClick={() => onChange({ type: '' })}
        >
          All
        </button>
        {typeOptions.map((type) => (
          <button
            key={type}
            type="button"
            className={`pf-chip ${selectedType === type ? 'is-selected' : ''}`.trim()}
            onClick={() => onChange({ type })}
          >
            {type === 'Hackathon'
              ? 'Hackathons'
              : type === 'Internship'
                ? 'Internships'
                : type === 'Scholarship'
                  ? 'Scholarships'
                  : type}
          </button>
        ))}
      </div>

      <div className="opportunity-filters__grid">
        <Select
          id="opportunity-location"
          label="Location"
          value={selectedLocation}
          onChange={(event) => onChange({ location: event.target.value })}
        >
          <option value="">All locations</option>
          {locations.map((location) => (
            <option key={location} value={location}>
              {location}
            </option>
          ))}
        </Select>

        <Select
          id="opportunity-skill"
          label="Skill"
          value={selectedSkill}
          onChange={(event) => onChange({ skill: event.target.value })}
        >
          <option value="">All skills</option>
          {skillOptions.map((skill) => (
            <option key={skill} value={skill}>
              {skill}
            </option>
          ))}
        </Select>

        <Select
          id="opportunity-status"
          label="Status"
          value={selectedStatus}
          onChange={(event) => onChange({ status: event.target.value })}
        >
          {STATUS_OPTIONS.map((option) => (
            <option key={option.value || 'all'} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>

        <Select
          id="opportunity-sort"
          label="Sort"
          value={sort}
          onChange={(event) => onChange({ sort: event.target.value })}
        >
          {SORT_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
      </div>
    </div>
  )
}

export default OpportunityFilters
