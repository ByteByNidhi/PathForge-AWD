function Badge({ children, tone = 'neutral', className = '' }) {
  const toneClass = tone === 'neutral' ? '' : `pf-badge--${tone}`
  return <span className={`pf-badge ${toneClass} ${className}`.trim()}>{children}</span>
}

export default Badge
