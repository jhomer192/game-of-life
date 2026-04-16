// Conway's Game of Life grid logic. Stored as a flat Uint8Array of length
// cols*rows where each cell is 0 (dead) or 1 (alive). A scratch buffer is
// reused to avoid per-tick allocations.

import type { Pattern } from './patterns'

export interface Grid {
  cols: number
  rows: number
  cells: Uint8Array
}

export function createGrid(cols: number, rows: number): Grid {
  return { cols, rows, cells: new Uint8Array(cols * rows) }
}

export function cloneGrid(grid: Grid): Grid {
  return { cols: grid.cols, rows: grid.rows, cells: new Uint8Array(grid.cells) }
}

export function idx(grid: Grid, x: number, y: number): number {
  return y * grid.cols + x
}

export function getCell(grid: Grid, x: number, y: number): 0 | 1 {
  return grid.cells[idx(grid, x, y)] as 0 | 1
}

export function setCell(grid: Grid, x: number, y: number, value: 0 | 1): void {
  grid.cells[idx(grid, x, y)] = value
}

export function clearGrid(grid: Grid): void {
  grid.cells.fill(0)
}

export function randomizeGrid(grid: Grid, density = 0.28): void {
  const { cells } = grid
  for (let i = 0; i < cells.length; i++) {
    cells[i] = Math.random() < density ? 1 : 0
  }
}

export function countLive(grid: Grid): number {
  let count = 0
  const { cells } = grid
  for (let i = 0; i < cells.length; i++) count += cells[i]
  return count
}

/**
 * Advance the grid one generation into `next` (must be same dimensions).
 * Uses toroidal wrap-around so spaceships glide forever.
 */
export function step(grid: Grid, next: Grid): void {
  const { cols, rows, cells } = grid
  const out = next.cells

  for (let y = 0; y < rows; y++) {
    const yUp = y === 0 ? rows - 1 : y - 1
    const yDn = y === rows - 1 ? 0 : y + 1
    const rowBase = y * cols
    const upBase = yUp * cols
    const dnBase = yDn * cols

    for (let x = 0; x < cols; x++) {
      const xL = x === 0 ? cols - 1 : x - 1
      const xR = x === cols - 1 ? 0 : x + 1

      const n =
        cells[upBase + xL] +
        cells[upBase + x] +
        cells[upBase + xR] +
        cells[rowBase + xL] +
        cells[rowBase + xR] +
        cells[dnBase + xL] +
        cells[dnBase + x] +
        cells[dnBase + xR]

      const alive = cells[rowBase + x]
      // B3/S23
      out[rowBase + x] = n === 3 || (alive === 1 && n === 2) ? 1 : 0
    }
  }
}

export function stampPattern(
  grid: Grid,
  pattern: Pattern,
  originX: number,
  originY: number,
  clearFirst = false,
): void {
  if (clearFirst) clearGrid(grid)
  const { cols, rows, cells } = grid
  for (const [px, py] of pattern.cells) {
    const x = originX + px
    const y = originY + py
    if (x < 0 || y < 0 || x >= cols || y >= rows) continue
    cells[y * cols + x] = 1
  }
}
