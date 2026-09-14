function initialsFromName(name) {
  return String(name || 'P')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('')
}

function Avatar({ name, className = '' }) {
  return (
    <span className={`pf-avatar ${className}`.trim()} aria-hidden="true">
      {initialsFromName(name)}
    </span>
  )
}

export default Avatar
