interface FilterSelectProps {
  label: string
  value: string
  options: string[]
  allLabel: string
  onChange: (value: string) => void
}

export function FilterSelect({ label, value, options, allLabel, onChange }: FilterSelectProps) {
  return (
    <div className="filter-group">
      <label>{label}</label>
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">{allLabel}</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </div>
  )
}
