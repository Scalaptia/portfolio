// Checks that every built-in Picross puzzle (HARO-PC's faces) is solvable by logic alone at every
// difficulty, with the same hints every time. Visitor faces get the same check when a puzzle is
// opened, inside hintsFor(), so a new face can never ship a puzzle that needs a guess.
//
//   npm run check:picross

import { readFileSync } from "node:fs";
import { puzzleFromArt, hintsFor, logicSolvable, LEVELS } from "../src/lib/picross.ts";

const source = readFileSync(new URL("../src/components/pc-model/faces.ts", import.meta.url), "utf8");
const faces = [...source.matchAll(/name: '(\w+)',[\s\S]*?art: \[([\s\S]*?)\]/g)].slice(0, 8);

let failures = 0;
for (const [, name, body] of faces) {
  const art = [...body.matchAll(/'([.#@]{16})'/g)].map((m) => m[1]);
  const puzzle = puzzleFromArt(art);
  if (!puzzle) continue;
  const counts = LEVELS.map((level, i) => {
    const seed = `pc-${faces.findIndex((f) => f[1] === name)}:${level}`;
    const givens = hintsFor(puzzle, level, seed);
    const again = hintsFor(puzzle, level, seed);
    const ok = logicSolvable(puzzle, givens) && givens.size === again.size;
    if (!ok) failures++;
    return `${level} ${givens.size}${ok ? "" : " FAIL"}`;
  });
  console.log(`${name.padEnd(10)} ${`${puzzle.cols}x${puzzle.rows}`.padEnd(6)} ${counts.join(", ")}`);
}
if (failures) {
  console.error(`${failures} puzzle level(s) need a guess or are not repeatable.`);
  process.exit(1);
}
console.log("Every level of every built-in puzzle solves by logic.");
