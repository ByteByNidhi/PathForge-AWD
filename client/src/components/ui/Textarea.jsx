function Textarea({ id, label, error, className = '', ...props }) {
  return (
    <label className={`pf-field ${className}`.trim()} htmlFor={id}>
      {label ? <span className="pf-label">{label}</span> : null}
      <textarea id={id} className="pf-textarea" {...props} />
      {error ? <span className="pf-field-error">{error}</span> : null}
    </label>
  )
}

export default Textarea
