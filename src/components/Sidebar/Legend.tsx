export function Legend() {
  return (
    <div className="legend">
      <div className="legend-row">
        <span className="dot" style={{ background: 'var(--franchise)' }} />
        Franchise
      </div>
      <div className="legend-row">
        <span className="dot" style={{ background: 'var(--agent)' }} />
        Agent
      </div>
      <div className="legend-row">
        <span className="dot" style={{ background: 'var(--tc)' }} />
        TC Agent
      </div>
    </div>
  )
}
