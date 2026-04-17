import { applyTheme, type ThemeId } from '../lib/theme'

const THEMES: { id: ThemeId; label: string; accent: string; accent2: string }[] = [
  { id: 'mocha',       label: 'Mocha',       accent: '#89b4fa', accent2: '#cba6f7' },
  { id: 'tokyo-night', label: 'Tokyo Night', accent: '#7aa2f7', accent2: '#bb9af7' },
  { id: 'dracula',     label: 'Dracula',     accent: '#8be9fd', accent2: '#bd93f9' },
  { id: 'nord',        label: 'Nord',        accent: '#88c0d0', accent2: '#b48ead' },
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
