function Card({ as: Component = 'section', className = '', children, ...props }) {
  return (
    <Component className={`pf-card ${className}`.trim()} {...props}>
      {children}
    </Component>
  )
}

export default Card
