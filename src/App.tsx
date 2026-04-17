import { useEffect, useState } from 'react'
import { GameOfLife } from './components/GameOfLife'
import { ThemePicker } from './components/ThemePicker'
import { initTheme } from './lib/theme'

function App() {
  // Track theme changes triggered by ThemePicker so React re-renders the picker
  const [theme, setTheme] = useState(() => {
    initTheme()
    return document.documentElement.getAttribute('data-theme') ?? 'mocha'
  })

  useEffect(() => {
    const handler = () => {
      setTheme(document.documentElement.getAttribute('data-theme') ?? 'mocha')
    }
    document.documentElement.addEventListener('themechange', handler)
    return () => document.documentElement.removeEventListener('themechange', handler)
  }, [])

  return (
    <>
      <ThemePicker key={theme} />
      <GameOfLife />
    </>
  )
}

export default App
