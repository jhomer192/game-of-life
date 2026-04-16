# Conway's Game of Life

An interactive, canvas-based implementation of Conway's Game of Life.
Built with Vite, React, TypeScript, and Tailwind CSS.

Live demo: https://jhomer192.github.io/game-of-life/

## Features

- 60fps canvas renderer backed by a `Uint8Array` grid and a reused scratch buffer
- Play / Pause / Step / Clear / Randomize controls
- Speed slider (1-60 generations per second)
- Four grid sizes from 60x36 up to 180x108
- Click to toggle cells, drag to paint or erase
- Pattern library: Glider, Lightweight Spaceship, Pulsar, Pentadecathlon, R-pentomino, and the Gosper Glider Gun
- Stats overlay: generation, live cell count, FPS, grid size
- Keyboard shortcuts: `Space` play/pause, `S` step, `R` randomize, `C` clear

The grid wraps toroidally, so spaceships glide forever.

## Rules

Classic `B3/S23`:

- A live cell with 2 or 3 live neighbors survives; otherwise it dies.
- A dead cell with exactly 3 live neighbors becomes alive.

## Development

```bash
npm install
npm run dev      # start Vite dev server
npm run build    # type-check and build to dist/
npm run preview  # preview the production build locally
npm run lint     # run ESLint
```

## Deployment

The included GitHub Actions workflow (`.github/workflows/deploy.yml`) builds
the app and publishes `dist/` to GitHub Pages on every push to `main`.
