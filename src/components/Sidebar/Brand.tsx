import logo from '../../assets/Logo Jnt.jpg'

interface BrandProps {
  theme: 'light' | 'dark'
  onToggleTheme: () => void
}

export function Brand({ theme, onToggleTheme }: BrandProps) {
  const nextLabel = theme === 'dark' ? 'Ganti ke mode terang' : 'Ganti ke mode gelap'

  return (
    <div className="brand">
      <img className="brand-logo" src={logo} alt="J&amp;T Express" />
      <div className="brand-copy">
        <div className="brand-title">Drop Point Map</div>
        <div className="brand-sub">Jawa &amp; Bali · Data operasional</div>
      </div>
      <button
        type="button"
        className="theme-toggle"
        onClick={onToggleTheme}
        aria-label={nextLabel}
        title={nextLabel}
      >
        <span aria-hidden="true">{theme === 'dark' ? '☀' : '☾'}</span>
      </button>
    </div>
  )
}
