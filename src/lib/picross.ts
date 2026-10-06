// Picross from the PC's faces. Every lit pixel of a face (# or @) is a filled cell. The face is
// cropped to its drawing first, so a face with empty borders makes a smaller, phone-sized puzzle.
//
// A puzzle counts as solved when every row and column matches its clues, not when the grid
// matches the drawing cell for cell. Some drawings have more than one answer to their clues, and
// any of them is a correct solve.

export interface Puzzle {
  rows: number;
  cols: number;
  /** The drawing, cropped. Shown once the puzzle is solved. */
  solution: boolean[][];
  rowClues: number[][];
  colClues: number[][];
  /** Where the crop sits in the full 16x16 face, for drawing the reveal. */
  top: number;
  left: number;
}

/** Runs of filled cells in a line, in order. An empty line's clue is [0]. */
export function cluesOf(line: boolean[]): number[] {
  const runs: number[] = [];
  let run = 0;
  for (const filled of line) {
    if (filled) run++;
    else if (run) {
      runs.push(run);
      run = 0;
    }
  }
  if (run) runs.push(run);
  return runs.length ? runs : [0];
}

const sameRuns = (a: number[], b: number[]) => a.length === b.length && a.every((n, i) => n === b[i]);

export function puzzleFromArt(art: string[]): Puzzle | null {
  const lit = art.map((row) => [...row].map((c) => c === "#" || c === "@"));
  const filledRows = lit.map((row, y) => (row.some(Boolean) ? y : -1)).filter((y) => y >= 0);
  const filledCols = lit[0].map((_, x) => (lit.some((row) => row[x]) ? x : -1)).filter((x) => x >= 0);
  if (!filledRows.length) return null;

  const top = filledRows[0];
  const left = filledCols[0];
  const solution = lit.slice(top, filledRows[filledRows.length - 1] + 1).map((row) => row.slice(left, filledCols[filledCols.length - 1] + 1));
  const rows = solution.length;
  const cols = solution[0].length;
  // Too small to be a puzzle worth the name.
  if (rows < 3 || cols < 3) return null;

  return {
    rows,
    cols,
    solution,
    rowClues: solution.map(cluesOf),
    colClues: Array.from({ length: cols }, (_, x) => cluesOf(solution.map((row) => row[x]))),
    top,
    left,
  };
}

export const rowDone = (p: Puzzle, filled: boolean[][], y: number) => sameRuns(cluesOf(filled[y]), p.rowClues[y]);
export const colDone = (p: Puzzle, filled: boolean[][], x: number) => sameRuns(cluesOf(filled.map((row) => row[x])), p.colClues[x]);

export function solved(p: Puzzle, filled: boolean[][]): boolean {
  for (let y = 0; y < p.rows; y++) if (!rowDone(p, filled, y)) return false;
  for (let x = 0; x < p.cols; x++) if (!colDone(p, filled, x)) return false;
  return true;
}

export type Mark = "" | "fill" | "cross";

export const emptyMarks = (p: Puzzle): Mark[][] => Array.from({ length: p.rows }, () => Array<Mark>(p.cols).fill(""));
export const filledOf = (marks: Mark[][]) => marks.map((row) => row.map((m) => m === "fill"));

/** Marks as one string, for localStorage: . empty, # filled, x crossed. */
export const encodeMarks = (marks: Mark[][]) => marks.map((row) => row.map((m) => (m === "fill" ? "#" : m === "cross" ? "x" : ".")).join("")).join("/");

export function decodeMarks(p: Puzzle, value: unknown): Mark[][] | null {
  if (typeof value !== "string") return null;
  const rows = value.split("/");
  if (rows.length !== p.rows || rows.some((r) => r.length !== p.cols)) return null;
  return rows.map((r) => [...r].map((c) => (c === "#" ? "fill" : c === "x" ? "cross" : "")));
}

// --- solvable by logic -------------------------------------------------------------------------
//
// A drawing's clues often leave cells that logic cannot settle: two eyes give the same clues a
// cell to the left or right. So every puzzle starts with some cells revealed, picked so that a
// person can solve the rest line by line without ever guessing. lineSolve() is that person.

export type Level = "easy" | "medium" | "hard";
export const LEVELS: Level[] = ["easy", "medium", "hard"];

/** Revealed cells, keyed "x,y", with what they are. */
export type Givens = Map<string, boolean>;

const key = (x: number, y: number) => `${x},${y}`;

// Every way a line's runs can sit in it, given the cells already known. Memoised per clue and
// length, then filtered against the known cells each time.
const placementCache = new Map<string, boolean[][]>();
function placements(len: number, runs: number[]): boolean[][] {
  const id = `${len}:${runs.join(",")}`;
  const cached = placementCache.get(id);
  if (cached) return cached;
  const out: boolean[][] = [];
  if (runs.length === 1 && runs[0] === 0) out.push(Array(len).fill(false));
  else {
    const place = (i: number, acc: boolean[]) => {
      if (i === runs.length) {
        out.push([...acc, ...Array(len - acc.length).fill(false)]);
        return;
      }
      const rest = runs.slice(i + 1).reduce((a, b) => a + b + 1, 0);
      for (let start = acc.length; start + runs[i] + rest <= len; start++) {
        const next = [...acc, ...Array(start - acc.length).fill(false), ...Array(runs[i]).fill(true)];
        place(i + 1, i < runs.length - 1 ? [...next, false] : next);
      }
    };
    place(0, []);
  }
  placementCache.set(id, out);
  return out;
}

/**
 * Solve as far as logic goes: settle every cell that all of its row's (or column's) possible
 * placements agree on, and repeat until nothing changes. Returns the grid, with null for the cells
 * logic could not settle.
 */
export function lineSolve(p: Puzzle, givens: Givens = new Map()): (boolean | null)[][] {
  const g: (boolean | null)[][] = Array.from({ length: p.rows }, (_, y) =>
    Array.from({ length: p.cols }, (_, x) => (givens.has(key(x, y)) ? givens.get(key(x, y))! : null)),
  );
  let changed = true;
  while (changed) {
    changed = false;
    for (let y = 0; y < p.rows; y++) {
      const fits = placements(p.cols, p.rowClues[y]).filter((pl) => pl.every((v, x) => g[y][x] === null || g[y][x] === v));
      if (!fits.length) return g;
      for (let x = 0; x < p.cols; x++) {
        if (g[y][x] !== null) continue;
        if (fits.every((pl) => pl[x])) (g[y][x] = true), (changed = true);
        else if (fits.every((pl) => !pl[x])) (g[y][x] = false), (changed = true);
      }
    }
    for (let x = 0; x < p.cols; x++) {
      const fits = placements(p.rows, p.colClues[x]).filter((pl) => pl.every((v, y) => g[y][x] === null || g[y][x] === v));
      if (!fits.length) return g;
      for (let y = 0; y < p.rows; y++) {
        if (g[y][x] !== null) continue;
        if (fits.every((pl) => pl[y])) (g[y][x] = true), (changed = true);
        else if (fits.every((pl) => !pl[y])) (g[y][x] = false), (changed = true);
      }
    }
  }
  return g;
}

const unknownCount = (g: (boolean | null)[][]) => g.reduce((n, row) => n + row.filter((v) => v === null).length, 0);

/** Solvable by logic alone from these givens, ending on the drawing itself. */
export function logicSolvable(p: Puzzle, givens: Givens): boolean {
  const g = lineSolve(p, givens);
  return g.every((row, y) => row.every((v, x) => v === p.solution[y][x]));
}

// A small seeded random, so a face's hints are the same on every device.
function seeded(text: string) {
  let h = 2166136261;
  for (const c of text) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}

// On top of Hard's minimum, this share of the still-hidden cells is revealed.
const EXTRA: Record<Level, number> = { hard: 0, medium: 0.12, easy: 0.25 };

/**
 * The cells a puzzle starts with at a level. Hard is a near-minimal set: cells are added one at a
 * time, each the one that lets logic settle the most of the grid, until the whole thing solves,
 * and then any that turn out not to be needed are taken away again. Medium and Easy reveal more on
 * top of Hard's, so they stay solvable and only get gentler.
 */
export function hintsFor(p: Puzzle, level: Level, seed: string): Givens {
  const random = seeded(seed);
  const truth = (x: number, y: number) => p.solution[y][x];
  const givens: Givens = new Map();

  let grid = lineSolve(p, givens);
  while (unknownCount(grid) > 0) {
    const open: [number, number][] = [];
    grid.forEach((row, y) => row.forEach((v, x) => v === null && open.push([x, y])));
    // Trying every open cell is slow on big puzzles; a few dozen candidates find a good one.
    for (let i = open.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [open[i], open[j]] = [open[j], open[i]];
    }
    let best = open[0];
    let bestLeft = Infinity;
    for (const [x, y] of open.slice(0, 24)) {
      const trial = new Map(givens).set(key(x, y), truth(x, y));
      const left = unknownCount(lineSolve(p, trial));
      if (left < bestLeft) (best = [x, y]), (bestLeft = left);
    }
    givens.set(key(best[0], best[1]), truth(best[0], best[1]));
    grid = lineSolve(p, givens);
  }

  // Take back any hint the rest make unnecessary.
  const order = [...givens.keys()].sort(() => random() - 0.5);
  for (const k of order) {
    const value = givens.get(k)!;
    givens.delete(k);
    if (!logicSolvable(p, givens)) givens.set(k, value);
  }

  // Gentler levels reveal more, leaning on filled cells, which help a person more than blanks.
  const hidden: [number, number][] = [];
  for (let y = 0; y < p.rows; y++) for (let x = 0; x < p.cols; x++) if (!givens.has(key(x, y))) hidden.push([x, y]);
  const extra = Math.round(hidden.length * EXTRA[level]);
  hidden
    .map((cell) => ({ cell, weight: random() + (truth(cell[0], cell[1]) ? 0.5 : 0) }))
    .sort((a, b) => b.weight - a.weight)
    .slice(0, extra)
    .forEach(({ cell: [x, y] }) => givens.set(key(x, y), truth(x, y)));

  return givens;
}

export const givenAt = (givens: Givens, x: number, y: number) => givens.get(key(x, y));
