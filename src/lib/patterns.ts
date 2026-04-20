// Patterns are expressed as lists of [x, y] offsets relative to the pattern's
// top-left corner. When loaded they are re-centered on the current grid.

export interface Pattern {
  id: string
  name: string
  description: string
  cells: ReadonlyArray<readonly [number, number]>
}

export const PATTERNS: readonly Pattern[] = [
  {
    id: 'glider',
    name: 'Glider',
    description: 'The smallest, most common spaceship.',
    cells: [
      [1, 0],
      [2, 1],
      [0, 2],
      [1, 2],
      [2, 2],
    ],
  },
  {
    id: 'lwss',
    name: 'Lightweight Spaceship',
    description: 'Travels horizontally every 4 generations.',
    cells: [
      [1, 0],
      [4, 0],
      [0, 1],
      [0, 2],
      [4, 2],
      [0, 3],
      [1, 3],
      [2, 3],
      [3, 3],
    ],
  },
  {
    id: 'pulsar',
    name: 'Pulsar',
    description: 'Period-3 oscillator with 48 live cells.',
    cells: [
      [2, 0],
      [3, 0],
      [4, 0],
      [8, 0],
      [9, 0],
      [10, 0],
      [0, 2],
      [5, 2],
      [7, 2],
      [12, 2],
      [0, 3],
      [5, 3],
      [7, 3],
      [12, 3],
      [0, 4],
      [5, 4],
      [7, 4],
      [12, 4],
      [2, 5],
      [3, 5],
      [4, 5],
      [8, 5],
      [9, 5],
      [10, 5],
      [2, 7],
      [3, 7],
      [4, 7],
      [8, 7],
      [9, 7],
      [10, 7],
      [0, 8],
      [5, 8],
      [7, 8],
      [12, 8],
      [0, 9],
      [5, 9],
      [7, 9],
      [12, 9],
      [0, 10],
      [5, 10],
      [7, 10],
      [12, 10],
      [2, 12],
      [3, 12],
      [4, 12],
      [8, 12],
      [9, 12],
      [10, 12],
    ],
  },
  {
    id: 'pentadecathlon',
    name: 'Pentadecathlon',
    description: 'Period-15 oscillator built from a 1x8 bar.',
    cells: [
      [1, 0],
      [1, 1],
      [0, 2],
      [2, 2],
      [1, 3],
      [1, 4],
      [1, 5],
      [1, 6],
      [0, 7],
      [2, 7],
      [1, 8],
      [1, 9],
    ],
  },
  {
    id: 'r-pentomino',
    name: 'R-pentomino',
    description: 'Tiny seed that stays chaotic for 1103 generations.',
    cells: [
      [1, 0],
      [2, 0],
      [0, 1],
      [1, 1],
      [1, 2],
    ],
  },
  {
    id: 'gosper-glider-gun',
    name: 'Gosper Glider Gun',
    description: 'First known pattern with unbounded growth.',
    cells: [
      [0, 4],
      [0, 5],
      [1, 4],
      [1, 5],
      [10, 4],
      [10, 5],
      [10, 6],
      [11, 3],
      [11, 7],
      [12, 2],
      [12, 8],
      [13, 2],
      [13, 8],
      [14, 5],
      [15, 3],
      [15, 7],
      [16, 4],
      [16, 5],
      [16, 6],
      [17, 5],
      [20, 2],
      [20, 3],
      [20, 4],
      [21, 2],
      [21, 3],
      [21, 4],
      [22, 1],
      [22, 5],
      [24, 0],
      [24, 1],
      [24, 5],
      [24, 6],
      [34, 2],
      [34, 3],
      [35, 2],
      [35, 3],
    ],
  },
]

export function patternBounds(pattern: Pattern): { width: number; height: number } {
  let maxX = 0
  let maxY = 0
  for (const [x, y] of pattern.cells) {
    if (x > maxX) maxX = x
    if (y > maxY) maxY = y
  }
  return { width: maxX + 1, height: maxY + 1 }
}

// Parse a Run-Length Encoded pattern (the standard Conway's Life format).
// Ref: https://conwaylife.com/wiki/Run_Length_Encoded
// Lines starting with '#' are comments ('#N name', '#C desc' are recognized).
// An 'x = N, y = N' header line is skipped. The body is runs of 'b' (dead),
// 'o' (alive), '$' (end of row), terminated by '!'. Digits before a tag are
// run-lengths.
export function parseRLE(text: string): Pattern {
  let name = 'Imported'
  let description = ''
  const bodyLines: string[] = []
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim()
    if (!line) continue
    if (line.startsWith('#N')) name = line.slice(2).trim() || name
    else if (line.startsWith('#C') || line.startsWith('#c')) {
      const chunk = line.slice(2).trim()
      description = description ? `${description} ${chunk}` : chunk
    }
    else if (line.startsWith('#')) continue
    else if (/^\s*x\s*=/.test(line)) continue
    else bodyLines.push(line)
  }
  const body = bodyLines.join('').replace(/\s+/g, '')
  const cells: Array<[number, number]> = []
  let x = 0
  let y = 0
  let run = 0
  for (const ch of body) {
    if (ch === '!') break
    if (ch >= '0' && ch <= '9') {
      run = run * 10 + (ch.charCodeAt(0) - 48)
    } else if (ch === 'b' || ch === 'o') {
      const n = run || 1
      if (ch === 'o') {
        for (let i = 0; i < n; i++) cells.push([x + i, y])
      }
      x += n
      run = 0
    } else if (ch === '$') {
      const n = run || 1
      y += n
      x = 0
      run = 0
    }
    // Anything else (including unknown tags) is skipped
  }
  if (cells.length === 0) throw new Error('No live cells found in RLE')
  // Normalize so the pattern's top-left is at (0,0)
  let minX = Infinity
  let minY = Infinity
  for (const [cx, cy] of cells) {
    if (cx < minX) minX = cx
    if (cy < minY) minY = cy
  }
  const normalized = cells.map(([cx, cy]) => [cx - minX, cy - minY] as [number, number])
  const id = `rle-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'imported'}`
  return { id, name, description: description || `Imported RLE pattern (${cells.length} cells)`, cells: normalized }
}
