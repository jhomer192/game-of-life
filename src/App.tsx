import { GameOfLife } from './components/GameOfLife'
import { ThemePicker } from './components/ThemePicker'

function App() {
  return (
    <>
      <div className="fixed top-3 right-3 z-50">
        <ThemePicker />
      </div>
      <GameOfLife />
    </>
  )
}

export default App
