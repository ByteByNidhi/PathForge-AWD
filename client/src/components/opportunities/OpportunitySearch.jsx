import { useEffect, useRef, useState } from 'react'
import Input from '../ui/Input.jsx'

function OpportunitySearch({ value, onChange }) {
  const [draft, setDraft] = useState(value)
  const onChangeRef = useRef(onChange)

  useEffect(() => {
    onChangeRef.current = onChange
  }, [onChange])

  useEffect(() => {
    setDraft(value)
  }, [value])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (draft !== value) {
        onChangeRef.current(draft)
      }
    }, 300)
    return () => window.clearTimeout(timer)
  }, [draft, value])

  return (
    <Input
      id="opportunity-search"
      label="Search"
      value={draft}
      onChange={(event) => setDraft(event.target.value)}
      placeholder="Search title, organization, type, or skills"
    />
  )
}

export default OpportunitySearch
