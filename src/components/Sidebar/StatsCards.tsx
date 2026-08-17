import type { DropPoint } from '../../types/dropPoint'

export function StatsCards({ points }: { points: DropPoint[] }) {
  const total = points.length
  const franchise = points.filter((d) => d.model === 'Franchise').length
  const agent = points.filter((d) => d.model === 'Agent').length

  return (
    <div className="stats">
      <div className="stat-card stat-total">
        <div className="stat-num">{total.toLocaleString('id-ID')}</div>
        <div className="stat-label">Drop Point</div>
      </div>
      <div className="stat-card stat-franchise">
        <div className="stat-num">{franchise.toLocaleString('id-ID')}</div>
        <div className="stat-label">Franchise</div>
      </div>
      <div className="stat-card stat-agent">
        <div className="stat-num">{agent.toLocaleString('id-ID')}</div>
        <div className="stat-label">Agent</div>
      </div>
    </div>
  )
}
