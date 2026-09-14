function Select({ id, label, error, children, className = '', ...props }) {
  return (
    <label className={`pf-field ${className}`.trim()} htmlFor={id}>
      {label ? <span className="pf-label">{label}</span> : null}
      <select id={id} className="pf-select" {...props}>
        {children}
      </select>
      {error ? <span className="pf-field-error">{error}</span> : null}
    </label>
  )
}

export default Select
