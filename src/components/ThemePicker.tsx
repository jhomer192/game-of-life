import { applyTheme, type ThemeId } from '../lib/theme'

const THEMES: { id: ThemeId; label: string; accent: string; accent2: string }[] = [
  { id: 'mocha',       label: 'Mocha',       accent: '#f5c2e7', accent2: '#cba6f7' },
  { id: 'tokyo-night', label: 'Tokyo Night', accent: '#73daca', accent2: '#7aa2f7' },
  { id: 'miami',       label: 'Miami',       accent: '#ff2d95', accent2: '#00f0ff' },
  { id: 'forest',      label: 'Forest',      accent: '#8fbc6a', accent2: '#c9a96e' },
]

export function ThemePicker() {
  const current = (document.documentElement.getAttribute('data-theme') ?? 'mocha') as ThemeId

  return (
    <div
      className="fixed top-3 right-3 z-50 flex items-center gap-1.5 rounded-full border px-2 py-1.5 backdrop-blur-sm"
      style={{ borderColor: 'var(--border)', backgroundColor: 'color-mix(in srgb, var(--surface) 80%, transparent)' }}
      role="group"
      aria-label="Color theme"
    >
      {THEMES.map((t) => (
        <button
          key={t.id}
          type="button"
          onClick={() => {
            applyTheme(t.id)
            document.documentElement.dispatchEvent(new Event('themechange'))
          }}
          title={t.label}
          aria-label={`${t.label} theme`}
          aria-pressed={current === t.id}
          style={{
            background: `linear-gradient(135deg, ${t.accent} 50%, ${t.accent2} 50%)`,
          }}
          className={`h-5 w-5 rounded-full border-2 transition-transform hover:scale-110 ${
            current === t.id ? 'border-white' : 'border-transparent'
          }`}
        />
      ))}
    </div>
  )
}
