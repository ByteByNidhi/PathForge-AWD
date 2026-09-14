function Button({
  children,
  variant = 'primary',
  type = 'button',
  className = '',
  block = false,
  ...props
}) {
  const classes = [
    'pf-btn',
    `pf-btn-${variant}`,
    block ? 'pf-btn-block' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <button type={type} className={classes} {...props}>
      {children}
    </button>
  )
}

export default Button
