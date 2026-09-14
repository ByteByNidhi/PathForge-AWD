function ProgressBar({ value = 0, max = 100, label }) {
  const percent = max === 0 ? 0 : Math.min(100, Math.max(0, (value / max) * 100))

  return (
    <div>
      {label ? <p className="pf-muted">{label}</p> : null}
      <div
        className="pf-progress"
        role="progressbar"
        aria-valuenow={Math.round(percent)}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div className="pf-progress__bar" style={{ width: `${percent}%` }} />
      </div>
    </div>
  )
}

export default ProgressBar
