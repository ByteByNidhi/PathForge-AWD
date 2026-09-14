function Modal({ open, title, children, onClose }) {
  if (!open) {
    return null
  }

  return (
    <div className="pf-modal-backdrop" onClick={onClose} role="presentation">
      <div
        className="pf-card pf-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="pf-modal-title"
        onClick={(event) => event.stopPropagation()}
      >
        {title ? (
          <h2 id="pf-modal-title" style={{ marginBottom: '1rem' }}>
            {title}
          </h2>
        ) : null}
        {children}
      </div>
    </div>
  )
}

export default Modal
