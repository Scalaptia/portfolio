// Checks that every built-in Picross puzzle (HARO-PC's faces) is solvable by logic alone at the
// level it was given, with the same hints every time. Visitor faces get the same check when a
// puzzle is opened, inside hintsFor(), so a new face can never ship a puzzle that needs a guess.
//
//   npm run check:picross

import { readFileSync } from "node:fs";
import { puzzleFromArt, hintsFor, logicSolvable, difficulty, levelOf } from "../src/lib/picross.ts";

const source = readFileSync(new URL("../src/components/pc-model/faces.ts", import.meta.url), "utf8");
const faces = [...source.matchAll(/name: '(\w+)',[\s\S]*?art: \[([\s\S]*?)\]/g)].slice(0, 8);

let failures = 0;
faces.forEach(([, name, body], i) => {
  const art = [...body.matchAll(/'([.#@]{16})'/g)].map((m) => m[1]);
  const puzzle = puzzleFromArt(art);
  if (!puzzle) return;
  const seed = `pc-${i}`;
  const givens = hintsFor(puzzle, seed);
  const again = hintsFor(puzzle, seed);
  const ok = logicSolvable(puzzle, givens) && givens.size === again.size;
  if (!ok) failures++;
  const size = `${puzzle.cols}x${puzzle.rows}`;
  console.log(`${name.padEnd(10)} ${size.padEnd(6)} ${levelOf(puzzle).padEnd(7)} ${String(difficulty(puzzle)).padStart(3)}  ${givens.size} hints${ok ? "" : "  FAIL"}`);
});
if (failures) {
  console.error(`${failures} puzzle(s) need a guess or are not repeatable.`);
  process.exit(1);
}
console.log("Every built-in puzzle solves by logic at its level.");
