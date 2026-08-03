# Conway's Game of Life

Conway's Game of Life in the browser. Paint cells on a grid, drop in a known pattern, and watch what four rules do with it.

Live at **https://jackhomer.com/game-of-life/**

![A pattern running on the grid](https://jackhomer.com/screenshots/game-of-life.webp)

## What it does

Play, pause, single-step, randomize, or clear. Speed runs from 1 to 60 generations per second and is decoupled from the display refresh rate, so the slider changes the simulation rather than the animation. Grids come in four sizes, from 60x36 to 180x108, and wrap at the edges: a glider that leaves the right side returns on the left.

Click a cell to toggle it, or drag to paint or erase a run of them. The pattern menu drops a Glider, Lightweight Spaceship, Pulsar, Pentadecathlon, R-pentomino, or Gosper Glider Gun onto the middle of the grid. Import RLE reads a run-length-encoded pattern pasted from conwaylife.com and stamps that instead.

Turf Wars changes the rule set. Cells belong to one of ten colored teams, and only same-team neighbors count toward survival and birth, so factions grow into each other and take ground.

A readout above the grid tracks the generation number, live cell count, frame rate, and grid size. Space plays and pauses, `S` steps while paused, `R` randomizes, `C` clears.

## The rules

B3/S23. A live cell with two or three live neighbors survives. A dead cell with exactly three live neighbors is born. Everything else dies or stays dead.

## Running it locally

```sh
npm install
npm run dev
```

`npm run build` type-checks and bundles into `dist/`, `npm run preview` serves that build, and `npm run lint` runs ESLint. `npm run deploy` pushes `dist/` to the `gh-pages` branch, which is what GitHub Pages serves.

## Stack

Vite, React, TypeScript, and Tailwind CSS. The grid is a flat `Uint8Array` stepped into a reused scratch buffer, so advancing a generation allocates nothing, and the whole grid is drawn to a canvas.

Write-up: https://jackhomer.com/projects/game-of-life/
