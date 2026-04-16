import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import {
  clearGrid,
  countLive,
  createGrid,
  randomizeGrid,
  stampPattern,
  step,
  type Grid,
} from '../lib/grid'
import { PATTERNS, patternBounds, type Pattern } from '../lib/patterns'

type SizeKey = 'S' | 'M' | 'L' | 'XL'
const SIZE_PRESETS: Record<SizeKey, { cols: number; rows: number; label: string }> = {
  S: { cols: 60, rows: 36, label: '60 x 36' },
  M: { cols: 100, rows: 60, label: '100 x 60' },
  L: { cols: 140, rows: 84, label: '140 x 84' },
  XL: { cols: 180, rows: 108, label: '180 x 108' },
}

const BG = '#0b0f17'
const GRID_LINE = 'rgba(148, 163, 184, 0.06)'
const DEFAULT_CELL_COLOR = '#7dd3fc'
const COLOR_PRESETS = [
  { name: 'Sky', value: '#7dd3fc' },
  { name: 'Violet', value: '#c4b5fd' },
  { name: 'Emerald', value: '#6ee7b7' },
  { name: 'Rose', value: '#fda4af' },
  { name: 'Amber', value: '#fcd34d' },
  { name: 'Pink', value: '#f9a8d4' },
  { name: 'Lime', value: '#bef264' },
  { name: 'Ghost', value: '#e2e8f0' },
]

function hexToGlow(hex: string, alpha = 0.4): string {
  const m = hex.replace('#', '')
  const r = parseInt(m.slice(0, 2), 16)
  const g = parseInt(m.slice(2, 4), 16)
  const b = parseInt(m.slice(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

export function GameOfLife() {
  const [sizeKey, setSizeKey] = useState<SizeKey>('M')
  const { cols, rows } = SIZE_PRESETS[sizeKey]

  // Grids live in refs so requestAnimationFrame loops don't re-render on every tick.
  // Seeded on first mount with the Gosper glider gun so new visitors see motion immediately.
  const initialGrid = useMemo(() => {
    const g = createGrid(cols, rows)
    const gosper = PATTERNS.find((p) => p.id === 'gosper-glider-gun')
    if (gosper) {
      const { width, height } = patternBounds(gosper)
      const ox = Math.max(0, Math.floor((cols - width) / 2))
      const oy = Math.max(0, Math.floor((rows - height) / 2))
      stampPattern(g, gosper, ox, oy, false)
    }
    return g
    // Only run once on first mount; grid size changes are handled separately.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  const gridRef = useRef<Grid>(initialGrid)
  const nextRef = useRef<Grid>(createGrid(cols, rows))
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)

  const [running, setRunning] = useState(false)
  const runningRef = useRef(running)
  useEffect(() => {
    runningRef.current = running
  }, [running])

  const [speed, setSpeed] = useState(12) // target ticks per second
  const speedRef = useRef(speed)
  useEffect(() => {
    speedRef.current = speed
  }, [speed])

  const [generation, setGeneration] = useState(0)
  const [liveCount, setLiveCount] = useState(() => countLive(initialGrid))
  const [fps, setFps] = useState(0)
  const [cellPx, setCellPx] = useState(10)
  const [tool, setTool] = useState<'paint' | 'erase'>('paint')
  const [cellColor, setCellColor] = useState<string>(DEFAULT_CELL_COLOR)

  useEffect(() => {
    dirtyRef.current = true
  }, [cellColor])

  const generationRef = useRef(0)
  const tickAccumulatorRef = useRef(0)
  const lastFrameTsRef = useRef<number | null>(null)
  const frameTimesRef = useRef<number[]>([])
  const dirtyRef = useRef(true)

  // Resize grid when the size preset changes, preserving existing cells where possible.
  useEffect(() => {
    const prev = gridRef.current
    const next = createGrid(cols, rows)
    const minCols = Math.min(prev.cols, cols)
    const minRows = Math.min(prev.rows, rows)
    for (let y = 0; y < minRows; y++) {
      for (let x = 0; x < minCols; x++) {
        next.cells[y * cols + x] = prev.cells[y * prev.cols + x]
      }
    }
    gridRef.current = next
    nextRef.current = createGrid(cols, rows)
    setLiveCount(countLive(next))
    dirtyRef.current = true
  }, [cols, rows])

  // Compute cell pixel size so the canvas fits the container.
  useLayoutEffect(() => {
    const container = containerRef.current
    if (!container) return
    const observer = new ResizeObserver(() => {
      const rect = container.getBoundingClientRect()
      const pad = 8
      const px = Math.max(
        2,
        Math.floor(Math.min((rect.width - pad) / cols, (rect.height - pad) / rows)),
      )
      setCellPx(px)
      dirtyRef.current = true
    })
    observer.observe(container)
    return () => observer.disconnect()
  }, [cols, rows])

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const grid = gridRef.current
    const w = grid.cols * cellPx
    const h = grid.rows * cellPx
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
      canvas.width = w * dpr
      canvas.height = h * dpr
      canvas.style.width = `${w}px`
      canvas.style.height = `${h}px`
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

    // Background
    ctx.fillStyle = BG
    ctx.fillRect(0, 0, w, h)

    // Grid lines (only when cells are large enough to be worth it)
    if (cellPx >= 6) {
      ctx.strokeStyle = GRID_LINE
      ctx.lineWidth = 1
      ctx.beginPath()
      for (let x = 0; x <= grid.cols; x++) {
        const px = Math.floor(x * cellPx) + 0.5
        ctx.moveTo(px, 0)
        ctx.lineTo(px, h)
      }
      for (let y = 0; y <= grid.rows; y++) {
        const py = Math.floor(y * cellPx) + 0.5
        ctx.moveTo(0, py)
        ctx.lineTo(w, py)
      }
      ctx.stroke()
    }

    // Live cells
    const inset = cellPx >= 6 ? 1 : 0
    ctx.fillStyle = cellColor
    ctx.shadowColor = hexToGlow(cellColor, 0.45)
    ctx.shadowBlur = cellPx >= 8 ? 6 : 0
    const { cells, cols: c, rows: r } = grid
    for (let y = 0; y < r; y++) {
      for (let x = 0; x < c; x++) {
        if (cells[y * c + x]) {
          ctx.fillRect(x * cellPx + inset, y * cellPx + inset, cellPx - inset, cellPx - inset)
        }
      }
    }
    ctx.shadowBlur = 0
  }, [cellPx, cellColor])

  // Main animation loop. We run at display refresh rate (rAF) and advance the
  // simulation based on an accumulator timed against the user's target ticks
  // per second, so changing the speed slider never fights the refresh rate.
  useEffect(() => {
    let handle = 0
    const tick = (ts: number) => {
      handle = requestAnimationFrame(tick)
      if (lastFrameTsRef.current == null) lastFrameTsRef.current = ts
      const dt = ts - lastFrameTsRef.current
      lastFrameTsRef.current = ts

      // FPS smoothing over last ~60 frames.
      const arr = frameTimesRef.current
      arr.push(dt)
      if (arr.length > 60) arr.shift()

      if (runningRef.current) {
        const perTick = 1000 / speedRef.current
        tickAccumulatorRef.current += dt
        // Cap iterations per frame so a slow tab doesn't freeze us catching up.
        let iters = 0
        while (tickAccumulatorRef.current >= perTick && iters < 4) {
          step(gridRef.current, nextRef.current)
          const tmp = gridRef.current
          gridRef.current = nextRef.current
          nextRef.current = tmp
          generationRef.current += 1
          tickAccumulatorRef.current -= perTick
          iters += 1
          dirtyRef.current = true
        }
        if (iters > 0) {
          setGeneration(generationRef.current)
          setLiveCount(countLive(gridRef.current))
        }
      } else {
        tickAccumulatorRef.current = 0
      }

      if (dirtyRef.current) {
        draw()
        dirtyRef.current = false
      }
    }
    handle = requestAnimationFrame(tick)

    const fpsInterval = window.setInterval(() => {
      const arr = frameTimesRef.current
      if (arr.length === 0) return
      const avg = arr.reduce((a, b) => a + b, 0) / arr.length
      setFps(avg > 0 ? Math.round(1000 / avg) : 0)
    }, 500)

    return () => {
      cancelAnimationFrame(handle)
      window.clearInterval(fpsInterval)
    }
  }, [draw])

  // Painting: track pointer, toggle/paint/erase cells beneath it. Pauses are
  // required for a faithful "draw your own life" experience so we just pause
  // while the user holds the mouse.
  const paintingRef = useRef<null | 'paint' | 'erase'>(null)
  const lastPaintedRef = useRef<string | null>(null)
  const wasRunningRef = useRef(false)

  const cellFromEvent = useCallback(
    (clientX: number, clientY: number): [number, number] | null => {
      const canvas = canvasRef.current
      if (!canvas) return null
      const rect = canvas.getBoundingClientRect()
      const x = Math.floor((clientX - rect.left) / cellPx)
      const y = Math.floor((clientY - rect.top) / cellPx)
      const g = gridRef.current
      if (x < 0 || y < 0 || x >= g.cols || y >= g.rows) return null
      return [x, y]
    },
    [cellPx],
  )

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.preventDefault()
    canvasRef.current?.setPointerCapture(e.pointerId)
    wasRunningRef.current = runningRef.current
    setRunning(false)
    const pos = cellFromEvent(e.clientX, e.clientY)
    if (!pos) return
    const [x, y] = pos
    const g = gridRef.current
    const current = g.cells[y * g.cols + x]
    // On press: toggle the cell; subsequent drag cells follow that mode.
    const mode: 'paint' | 'erase' =
      tool === 'erase' ? 'erase' : current ? 'erase' : 'paint'
    paintingRef.current = mode
    g.cells[y * g.cols + x] = mode === 'paint' ? 1 : 0
    lastPaintedRef.current = `${x},${y}`
    dirtyRef.current = true
    setLiveCount(countLive(g))
  }

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!paintingRef.current) return
    const pos = cellFromEvent(e.clientX, e.clientY)
    if (!pos) return
    const [x, y] = pos
    const key = `${x},${y}`
    if (lastPaintedRef.current === key) return
    lastPaintedRef.current = key
    const g = gridRef.current
    g.cells[y * g.cols + x] = paintingRef.current === 'paint' ? 1 : 0
    dirtyRef.current = true
    setLiveCount(countLive(g))
  }

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (canvasRef.current?.hasPointerCapture(e.pointerId)) {
      canvasRef.current.releasePointerCapture(e.pointerId)
    }
    paintingRef.current = null
    lastPaintedRef.current = null
    if (wasRunningRef.current) setRunning(true)
  }

  const doStep = () => {
    step(gridRef.current, nextRef.current)
    const tmp = gridRef.current
    gridRef.current = nextRef.current
    nextRef.current = tmp
    generationRef.current += 1
    setGeneration(generationRef.current)
    setLiveCount(countLive(gridRef.current))
    dirtyRef.current = true
  }

  const doClear = () => {
    clearGrid(gridRef.current)
    generationRef.current = 0
    setGeneration(0)
    setLiveCount(0)
    setRunning(false)
    dirtyRef.current = true
  }

  const doRandomize = () => {
    randomizeGrid(gridRef.current, 0.28)
    generationRef.current = 0
    setGeneration(0)
    setLiveCount(countLive(gridRef.current))
    dirtyRef.current = true
  }

  const loadPattern = (pattern: Pattern) => {
    const g = gridRef.current
    clearGrid(g)
    const { width, height } = patternBounds(pattern)
    const ox = Math.max(0, Math.floor((g.cols - width) / 2))
    const oy = Math.max(0, Math.floor((g.rows - height) / 2))
    stampPattern(g, pattern, ox, oy, false)
    generationRef.current = 0
    setGeneration(0)
    setLiveCount(countLive(g))
    setRunning(false)
    dirtyRef.current = true
  }

  const onPatternSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value
    if (!id) return
    const p = PATTERNS.find((x) => x.id === id)
    if (p) loadPattern(p)
    e.target.value = ''
  }

  // Keyboard shortcuts.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLElement) {
        const tag = e.target.tagName
        if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return
      }
      if (e.key === ' ') {
        e.preventDefault()
        setRunning((r) => !r)
      } else if (e.key.toLowerCase() === 's') {
        if (!runningRef.current) doStep()
      } else if (e.key.toLowerCase() === 'c') {
        doClear()
      } else if (e.key.toLowerCase() === 'r') {
        doRandomize()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const stats = useMemo(
    () => [
      { label: 'Generation', value: generation.toLocaleString() },
      { label: 'Alive', value: liveCount.toLocaleString() },
      { label: 'FPS', value: String(fps) },
      { label: 'Grid', value: `${cols} x ${rows}` },
    ],
    [generation, liveCount, fps, cols, rows],
  )

  return (
    <div className="mx-auto flex min-h-screen max-w-[1400px] flex-col gap-6 px-4 py-6 sm:px-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="bg-gradient-to-r from-sky-300 via-cyan-200 to-violet-300 bg-clip-text text-3xl font-semibold tracking-tight text-transparent sm:text-4xl">
            Conway&apos;s Game of Life
          </h1>
          <p className="mt-1 max-w-xl text-sm text-slate-400">
            A cellular automaton with four rules and infinite outcomes. Paint cells on a paused
            grid, load a pattern, or seed chaos and watch it evolve.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {stats.map((s) => (
            <span key={s.label} className="chip">
              <span className="text-slate-500">{s.label}</span>
              <span className="text-slate-100">{s.value}</span>
            </span>
          ))}
        </div>
      </header>

      <div className="flex flex-col gap-4 rounded-2xl border border-ink-700/80 bg-ink-900/60 p-3 shadow-[0_0_40px_-15px_rgba(56,189,248,0.35)] backdrop-blur-sm sm:p-4">
        <Toolbar
          running={running}
          onToggleRun={() => setRunning((r) => !r)}
          onStep={doStep}
          onClear={doClear}
          onRandomize={doRandomize}
          speed={speed}
          setSpeed={setSpeed}
          sizeKey={sizeKey}
          setSizeKey={setSizeKey}
          onPatternSelect={onPatternSelect}
          tool={tool}
          setTool={setTool}
          cellColor={cellColor}
          setCellColor={setCellColor}
        />

        <div
          ref={containerRef}
          className="relative mx-auto flex min-h-[420px] w-full items-center justify-center overflow-hidden rounded-xl border border-ink-700/70 bg-ink-950/80 p-1"
          style={{ aspectRatio: `${cols} / ${rows}` }}
        >
          <canvas
            ref={canvasRef}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            className="cursor-crosshair rounded-md"
          />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
          <p>
            <span className="text-slate-400">Tip:</span> drag to paint cells when paused. Space =
            play/pause, S = step, R = randomize, C = clear.
          </p>
          <p>
            B3/S23 rules on a toroidal grid. Built with React, TypeScript, and an HTMLCanvas.
          </p>
        </div>
      </div>

      <section className="rounded-2xl border border-ink-700/80 bg-ink-900/40 p-5 sm:p-6 backdrop-blur-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-slate-100">About Conway&apos;s Game of Life</h2>
          <a
            href="https://en.wikipedia.org/wiki/Conway%27s_Game_of_Life"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-md border border-ink-700 bg-ink-800 px-3 py-1.5 text-xs font-medium text-sky-300 hover:border-sky-500/60 hover:text-sky-200"
          >
            Read on Wikipedia
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M14 3h7v7M10 14L21 3M21 14v7H3V3h7" />
            </svg>
          </a>
        </div>
        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-slate-400">
          Devised in 1970 by British mathematician John Horton Conway, the Game of Life is a zero-player
          cellular automaton. Its evolution is determined entirely by its initial state — no further input
          required. Despite the trivially simple rules below, the system is Turing-complete and produces
          an astonishing variety of patterns: still lifes, oscillators, spaceships, guns, and self-replicators.
        </p>

        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <RuleCard
            symbol="−"
            title="Underpopulation"
            body="A live cell with fewer than 2 live neighbors dies."
            tone="rose"
          />
          <RuleCard
            symbol="="
            title="Survival"
            body="A live cell with 2 or 3 live neighbors stays alive."
            tone="emerald"
          />
          <RuleCard
            symbol="+"
            title="Overpopulation"
            body="A live cell with more than 3 live neighbors dies."
            tone="amber"
          />
          <RuleCard
            symbol="✱"
            title="Reproduction"
            body="A dead cell with exactly 3 live neighbors becomes alive."
            tone="sky"
          />
        </div>
      </section>
    </div>
  )
}

function RuleCard({
  symbol,
  title,
  body,
  tone,
}: {
  symbol: string
  title: string
  body: string
  tone: 'rose' | 'emerald' | 'amber' | 'sky'
}) {
  const toneMap = {
    rose: 'text-rose-300 bg-rose-500/10 border-rose-500/30',
    emerald: 'text-emerald-300 bg-emerald-500/10 border-emerald-500/30',
    amber: 'text-amber-300 bg-amber-500/10 border-amber-500/30',
    sky: 'text-sky-300 bg-sky-500/10 border-sky-500/30',
  } as const
  return (
    <div className="flex gap-3 rounded-lg border border-ink-700/70 bg-ink-900/60 p-3">
      <span
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-md border font-bold ${toneMap[tone]}`}
      >
        {symbol}
      </span>
      <div>
        <h3 className="text-sm font-semibold text-slate-200">{title}</h3>
        <p className="mt-0.5 text-xs leading-relaxed text-slate-400">{body}</p>
      </div>
    </div>
  )
}

interface ToolbarProps {
  running: boolean
  onToggleRun: () => void
  onStep: () => void
  onClear: () => void
  onRandomize: () => void
  speed: number
  setSpeed: (n: number) => void
  sizeKey: SizeKey
  setSizeKey: (k: SizeKey) => void
  onPatternSelect: (e: React.ChangeEvent<HTMLSelectElement>) => void
  tool: 'paint' | 'erase'
  setTool: (t: 'paint' | 'erase') => void
  cellColor: string
  setCellColor: (c: string) => void
}

function Toolbar({
  running,
  onToggleRun,
  onStep,
  onClear,
  onRandomize,
  speed,
  setSpeed,
  sizeKey,
  setSizeKey,
  onPatternSelect,
  tool,
  setTool,
  cellColor,
  setCellColor,
}: ToolbarProps) {
  return (
    <div className="flex flex-wrap items-center gap-2 sm:gap-3">
      <button className={`btn btn-primary`} onClick={onToggleRun} aria-label={running ? 'Pause' : 'Play'}>
        {running ? (
          <>
            <PauseIcon /> Pause
          </>
        ) : (
          <>
            <PlayIcon /> Play
          </>
        )}
      </button>
      <button className="btn" onClick={onStep} disabled={running}>
        <StepIcon /> Step
      </button>
      <button className="btn" onClick={onRandomize}>
        <ShuffleIcon /> Randomize
      </button>
      <button className="btn" onClick={onClear}>
        <TrashIcon /> Clear
      </button>

      <div className="ml-auto flex flex-wrap items-center gap-2 sm:gap-3">
        <label className="flex items-center gap-2 text-xs text-slate-400">
          <span className="uppercase tracking-wider">Speed</span>
          <input
            type="range"
            min={1}
            max={60}
            value={speed}
            onChange={(e) => setSpeed(Number(e.target.value))}
            className="w-28 sm:w-36"
            aria-label="Simulation speed"
          />
          <span className="w-10 font-mono tabular-nums text-slate-200">{speed} fps</span>
        </label>

        <label className="flex items-center gap-2 text-xs text-slate-400">
          <span className="uppercase tracking-wider">Size</span>
          <select
            value={sizeKey}
            onChange={(e) => setSizeKey(e.target.value as SizeKey)}
            className="rounded-md border border-ink-700 bg-ink-800 px-2 py-1 font-mono text-xs text-slate-200 outline-none hover:border-cell-glow focus:border-cell-glow"
            aria-label="Grid size"
          >
            {Object.entries(SIZE_PRESETS).map(([k, v]) => (
              <option key={k} value={k}>
                {k} - {v.label}
              </option>
            ))}
          </select>
        </label>

        <label className="flex items-center gap-2 text-xs text-slate-400">
          <span className="uppercase tracking-wider">Pattern</span>
          <select
            defaultValue=""
            onChange={onPatternSelect}
            className="rounded-md border border-ink-700 bg-ink-800 px-2 py-1 text-xs text-slate-200 outline-none hover:border-cell-glow focus:border-cell-glow"
            aria-label="Load pattern"
          >
            <option value="">Load pattern...</option>
            {PATTERNS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>

        <div
          className="inline-flex overflow-hidden rounded-md border border-ink-700 text-xs"
          role="group"
          aria-label="Paint tool"
        >
          <button
            type="button"
            className={`px-2 py-1 ${tool === 'paint' ? 'bg-cell-glow/25 text-sky-100' : 'bg-ink-800 text-slate-400 hover:text-slate-200'}`}
            onClick={() => setTool('paint')}
          >
            Paint
          </button>
          <button
            type="button"
            className={`border-l border-ink-700 px-2 py-1 ${tool === 'erase' ? 'bg-cell-glow/25 text-sky-100' : 'bg-ink-800 text-slate-400 hover:text-slate-200'}`}
            onClick={() => setTool('erase')}
          >
            Erase
          </button>
        </div>

        <div className="flex items-center gap-2 rounded-md border border-ink-700 bg-ink-800 px-2 py-1">
          <span className="text-[10px] uppercase tracking-wider text-slate-400">Cell</span>
          <div className="flex items-center gap-1">
            {COLOR_PRESETS.map((c) => (
              <button
                key={c.value}
                type="button"
                onClick={() => setCellColor(c.value)}
                title={c.name}
                aria-label={`Set cell color to ${c.name}`}
                className={`h-5 w-5 rounded-full border transition-transform hover:scale-110 ${
                  cellColor === c.value
                    ? 'border-white ring-2 ring-white/70'
                    : 'border-ink-700'
                }`}
                style={{ backgroundColor: c.value }}
              />
            ))}
          </div>
          <label className="ml-1 flex items-center" title="Custom color">
            <span className="sr-only">Custom color</span>
            <input
              type="color"
              value={cellColor}
              onChange={(e) => setCellColor(e.target.value)}
              className="h-5 w-6 cursor-pointer rounded border border-ink-700 bg-transparent p-0"
              aria-label="Pick custom cell color"
            />
          </label>
        </div>
      </div>
    </div>
  )
}

function PlayIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M8 5v14l11-7z" />
    </svg>
  )
}
function PauseIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M6 5h4v14H6zm8 0h4v14h-4z" />
    </svg>
  )
}
function StepIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M6 5v14l8-7zM16 5h2v14h-2z" />
    </svg>
  )
}
function ShuffleIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M3 6h4l10 12h4M3 18h4l2-2M15 8l2-2h4M17 4l4 2-4 2M17 16l4 2-4 2" />
    </svg>
  )
}
function TrashIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M4 7h16M9 7V4h6v3m-7 0v13a2 2 0 002 2h6a2 2 0 002-2V7" />
    </svg>
  )
}
