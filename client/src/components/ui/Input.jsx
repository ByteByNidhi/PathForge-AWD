function Input({
  id,
  label,
  error,
  type = 'text',
  className = '',
  ...props
}) {
  return (
    <label className={`pf-field ${className}`.trim()} htmlFor={id}>
      {label ? <span className="pf-label">{label}</span> : null}
      <input id={id} className="pf-input" type={type} {...props} />
      {error ? <span className="pf-field-error">{error}</span> : null}
    </label>
  )
}

export default Input
