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
