function PageHeader({ eyebrow, title, description, actions }) {
  return (
    <header className="pf-page-header">
      <div>
        {eyebrow ? <p className="pf-eyebrow">{eyebrow}</p> : null}
        <h1>{title}</h1>
        {description ? <p className="pf-muted" style={{ marginTop: '0.75rem' }}>{description}</p> : null}
      </div>
      {actions}
    </header>
  )
}

export default PageHeader
