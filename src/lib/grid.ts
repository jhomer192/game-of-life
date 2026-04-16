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

export function randomizeGrid(grid: Grid, density = 0.28, teams = 1): void {
  const { cells } = grid
  for (let i = 0; i < cells.length; i++) {
    if (Math.random() < density) {
      cells[i] = teams <= 1 ? 1 : 1 + Math.floor(Math.random() * teams)
    } else {
      cells[i] = 0
    }
  }
}

export function countLive(grid: Grid): number {
  let count = 0
  const { cells } = grid
  for (let i = 0; i < cells.length; i++) if (cells[i]) count++
  return count
}

/**
 * Advance the grid one generation into `next` (must be same dimensions).
 * Any non-zero cell counts as alive. Toroidal wrap-around.
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

      const nUl = cells[upBase + xL] ? 1 : 0
      const nU  = cells[upBase + x]  ? 1 : 0
      const nUr = cells[upBase + xR] ? 1 : 0
      const nL  = cells[rowBase + xL] ? 1 : 0
      const nR  = cells[rowBase + xR] ? 1 : 0
      const nDl = cells[dnBase + xL] ? 1 : 0
      const nD  = cells[dnBase + x]  ? 1 : 0
      const nDr = cells[dnBase + xR] ? 1 : 0

      const n = nUl + nU + nUr + nL + nR + nDl + nD + nDr
      const alive = cells[rowBase + x]
      if (alive) {
        out[rowBase + x] = n === 2 || n === 3 ? alive : 0
      } else {
        out[rowBase + x] = n === 3 ? 1 : 0
      }
    }
  }
}

/**
 * Turf Wars step: same-color (team) neighbors apply Conway's rules; cells of
 * other teams are treated as empty. A dead cell becomes a given team only if
 * it has exactly 3 neighbors of that team. A live cell survives only if 2 or
 * 3 of its neighbors share its team color.
 */
export function stepTurfWars(grid: Grid, next: Grid, teams: number): void {
  const { cols, rows, cells } = grid
  const out = next.cells
  const counts = new Uint8Array(teams + 1)

  for (let y = 0; y < rows; y++) {
    const yUp = y === 0 ? rows - 1 : y - 1
    const yDn = y === rows - 1 ? 0 : y + 1
    const rowBase = y * cols
    const upBase = yUp * cols
    const dnBase = yDn * cols

    for (let x = 0; x < cols; x++) {
      const xL = x === 0 ? cols - 1 : x - 1
      const xR = x === cols - 1 ? 0 : x + 1

      counts.fill(0)
      const neighbors = [
        cells[upBase + xL],
        cells[upBase + x],
        cells[upBase + xR],
        cells[rowBase + xL],
        cells[rowBase + xR],
        cells[dnBase + xL],
        cells[dnBase + x],
        cells[dnBase + xR],
      ]
      for (const v of neighbors) if (v) counts[v]++

      const alive = cells[rowBase + x]
      if (alive) {
        const same = counts[alive]
        out[rowBase + x] = same === 2 || same === 3 ? alive : 0
      } else {
        let born = 0
        for (let t = 1; t <= teams; t++) {
          if (counts[t] === 3) {
            born = t
            break
          }
        }
        out[rowBase + x] = born
      }
    }
  }
}

export function stampPattern(
  grid: Grid,
  pattern: Pattern,
  originX: number,
  originY: number,
  clearFirst = false,
  team = 1,
): void {
  if (clearFirst) clearGrid(grid)
  const { cols, rows, cells } = grid
  for (const [px, py] of pattern.cells) {
    const x = originX + px
    const y = originY + py
    if (x < 0 || y < 0 || x >= cols || y >= rows) continue
    cells[y * cols + x] = team
  }
}
