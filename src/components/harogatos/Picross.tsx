import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FACES, guestFace } from "@/components/pc-model/faces";
import type { ColorScheme } from "@/components/pc-model/faces";
import { fetchFaces } from "@/lib/arcadeApi";
import type { GuestFace } from "@/lib/guestFaces";
import { wearFace } from "@/lib/guestFaceShow";
import {
  puzzleFromArt,
  solved as isSolved,
  rowDone,
  colDone,
  emptyMarks,
  filledOf,
  encodeMarks,
  decodeMarks,
  hintsFor,
  givenAt,
  LEVELS,
  type Givens,
  type Level,
  type Mark,
  type Puzzle,
} from "@/lib/picross";
import { play } from "@/lib/sfx";
import FaceIcon from "./FaceIcon";
import { INVERSE } from "./phosphor";
import { strings } from "./strings";

// Picross, with the PC's own faces as a starter pack and every approved visitor face after them.
// Fill the cells the clues ask for; solve it and the face appears in its own colours. Progress and
// best times stay in this browser. See src/lib/picross.ts for the rules.

interface Entry {
  id: string;
  puzzle: Puzzle;
  art: string[];
  color: ColorScheme;
  accent?: string;
  /** Set for the PC's own faces. */
  faceIndex?: number;
  /** Set for visitors' faces. */
  guest?: GuestFace;
}

// Keyed by puzzle and level ("pc-0:hard"), so each difficulty has its own best time and progress.
interface Saved {
  solved: Record<string, number>;
  progress: Record<string, { marks: string; ms: number }>;
  level?: Level;
}

const STORE = "harogatos:picross";
const PAGE = { wide: 10, tall: 9 };

function load(): Saved {
  try {
    const raw = JSON.parse(localStorage.getItem(STORE) ?? "null");
    if (raw && typeof raw === "object") return { solved: raw.solved ?? {}, progress: raw.progress ?? {}, level: raw.level };
  } catch {
    // Start over.
  }
  return { solved: {}, progress: {} };
}

function save(data: Saved) {
  try {
    localStorage.setItem(STORE, JSON.stringify(data));
  } catch {
    // Not remembered. The puzzle still plays.
  }
}

const clock = (ms: number) => {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};

function ownEntries(): Entry[] {
  return FACES.flatMap((face, i) => {
    const puzzle = puzzleFromArt(face.art);
    return puzzle ? [{ id: `pc-${i}`, puzzle, art: face.art, color: face.color, accent: face.accent, faceIndex: i }] : [];
  });
}

function guestEntries(faces: GuestFace[]): Entry[] {
  return faces.flatMap((face) => {
    const puzzle = puzzleFromArt(face.art);
    if (!puzzle) return [];
    const data = guestFace(face.art, face.scheme);
    return [{ id: `face-${face.id}`, puzzle, art: face.art, color: data.color, accent: data.accent, guest: face }];
  });
}

// --- the board -------------------------------------------------------------------------------

function Board({
  entry,
  marks,
  givens,
  tool,
  cursor,
  onPaint,
}: {
  entry: Entry;
  marks: Mark[][];
  /** Cells the puzzle starts with. They are part of the grid but cannot be changed. */
  givens: Givens;
  tool: "fill" | "cross";
  cursor: [number, number] | null;
  onPaint: (cells: [number, number][], value: Mark) => void;
}) {
  const { puzzle: p } = entry;
  const t = strings();
  const holder = useRef<HTMLDivElement>(null);
  const [cell, setCell] = useState(16);
  const clueCols = Math.max(...p.rowClues.map((c) => c.length));
  const clueRows = Math.max(...p.colClues.map((c) => c.length));

  // Clues get their own columns and rows of the same grid, so one cell size fits everything.
  useEffect(() => {
    const el = holder.current;
    if (!el) return;
    const fit = () =>
      setCell(Math.max(10, Math.floor(Math.min(el.clientWidth / (p.cols + clueCols), el.clientHeight / (p.rows + clueRows)))));
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(el);
    return () => observer.disconnect();
  }, [p.cols, p.rows, clueCols, clueRows]);

  const filled = useMemo(() => filledOf(marks), [marks]);
  const paint = useRef<{ value: Mark; from: Mark } | null>(null);

  const cellAt = (e: React.PointerEvent): [number, number] | null => {
    const el = (document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null)?.closest<HTMLElement>("[data-cell]");
    if (!el) return null;
    return [Number(el.dataset.x), Number(el.dataset.y)];
  };

  // A drag repeats what the first cell got: fill or cross the cells that were empty, or clear the
  // ones that had the same mark as the first.
  const apply = (at: [number, number]) => {
    const stroke = paint.current;
    if (!stroke || givenAt(givens, at[0], at[1]) !== undefined) return;
    const current = marks[at[1]][at[0]];
    if (current === stroke.value) return;
    if (stroke.value === "" ? current !== stroke.from : current !== "") return;
    onPaint([at], stroke.value);
  };

  const size = { width: (p.cols + clueCols) * cell, height: (p.rows + clueRows) * cell };
  const font = Math.max(9, Math.round(cell * 0.6));

  return (
    <div ref={holder} className="w-full h-full flex items-center justify-center">
      <div
        role="grid"
        aria-label={t.picrossGrid}
        className="relative select-none touch-none"
        style={size}
        onPointerDown={(e) => {
          const at = cellAt(e);
          if (!at || givenAt(givens, at[0], at[1]) !== undefined) return;
          e.currentTarget.setPointerCapture(e.pointerId);
          const from = marks[at[1]][at[0]];
          const value: Mark = from === tool ? "" : tool;
          paint.current = { value, from };
          onPaint([at], value);
        }}
        onPointerMove={(e) => {
          if (!paint.current) return;
          const at = cellAt(e);
          if (at) apply(at);
        }}
        onPointerUp={() => (paint.current = null)}
        onPointerCancel={() => (paint.current = null)}
      >
        {/* Column clues, stacked to sit on the grid. */}
        {p.colClues.map((clue, x) => {
          const done = colDone(p, filled, x);
          return (
            <div
              key={`c${x}`}
              className={`absolute flex flex-col justify-end items-center leading-none tabular-nums ${done ? "opacity-35" : ""}`}
              style={{ left: (clueCols + x) * cell, top: 0, width: cell, height: clueRows * cell, fontSize: font, paddingBottom: cell * 0.15 }}
            >
              {clue.map((n, i) => (
                <span key={i} style={{ height: cell * 0.85, lineHeight: `${cell * 0.85}px` }}>
                  {n}
                </span>
              ))}
            </div>
          );
        })}
        {/* Row clues, right-aligned against the grid. */}
        {p.rowClues.map((clue, y) => {
          const done = rowDone(p, filled, y);
          return (
            <div
              key={`r${y}`}
              className={`absolute flex justify-end items-center gap-[0.35em] tabular-nums ${done ? "opacity-35" : ""}`}
              style={{ left: 0, top: (clueRows + y) * cell, width: clueCols * cell, height: cell, fontSize: font, paddingRight: cell * 0.25 }}
            >
              {clue.map((n, i) => (
                <span key={i}>{n}</span>
              ))}
            </div>
          );
        })}
        {/* The cells. Every fifth line is heavier, like a paper puzzle. */}
        {marks.map((row, y) =>
          row.map((mark, x) => {
            const here = cursor && cursor[0] === x && cursor[1] === y;
            const given = givenAt(givens, x, y) !== undefined;
            return (
              <div
                key={`${x}-${y}`}
                data-cell
                data-x={x}
                data-y={y}
                className="absolute flex items-center justify-center"
                style={{
                  left: (clueCols + x) * cell,
                  top: (clueRows + y) * cell,
                  width: cell,
                  height: cell,
                  borderRight: `${(x + 1) % 5 === 0 && x + 1 < p.cols ? 2 : 1}px solid var(--dim)`,
                  borderBottom: `${(y + 1) % 5 === 0 && y + 1 < p.rows ? 2 : 1}px solid var(--dim)`,
                  borderLeft: x === 0 ? "1px solid var(--dim)" : undefined,
                  borderTop: y === 0 ? "1px solid var(--dim)" : undefined,
                  outline: here ? "2px solid var(--fg)" : undefined,
                  outlineOffset: -2,
                }}
              >
                {/* A cell the puzzle started with: the same mark, dimmer, so it reads as given. */}
                {mark === "fill" && <div className={`absolute inset-[12%] bg-(--fg) ${given ? "opacity-55" : ""}`} />}
                {mark === "cross" && (
                  <span className={`leading-none ${given ? "opacity-30" : "opacity-60"}`} style={{ fontSize: cell * 0.7 }}>
                    ×
                  </span>
                )}
              </div>
            );
          }),
        )}
      </div>
    </div>
  );
}

// --- the app ---------------------------------------------------------------------------------

export default function Picross({ onExit, tall = false }: { onExit: () => void; tall?: boolean }) {
  const t = strings();
  const [view, setView] = useState<"pick" | "play" | "solved">("pick");
  const [visitors, setVisitors] = useState<Entry[] | null | undefined>(undefined);
  const [data, setData] = useState<Saved>(load);
  const [level, setLevel] = useState<Level>(() => data.level ?? "medium");
  const [givens, setGivens] = useState<Givens>(new Map());
  const [page, setPage] = useState(0);
  const [entry, setEntry] = useState<Entry | null>(null);
  const [marks, setMarks] = useState<Mark[][]>([]);
  const [tool, setTool] = useState<"fill" | "cross">("fill");
  const [cursor, setCursor] = useState<[number, number] | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [lastTime, setLastTime] = useState(0);
  const startedAt = useRef(0);
  const carried = useRef(0);
  // The latest grid, so a fast drag that paints several cells before React renders loses none.
  const marksRef = useRef<Mark[][]>([]);
  marksRef.current = marks;

  useEffect(() => {
    fetchFaces().then((faces) => setVisitors(faces ? guestEntries(faces) : null));
  }, []);

  const entries = useMemo(() => [...ownEntries(), ...(visitors ?? [])], [visitors]);
  const perPage = tall ? PAGE.tall : PAGE.wide;
  const pages = Math.max(1, Math.ceil(entries.length / perPage));

  // The clock runs while a puzzle is open, and carries over from where it was left.
  useEffect(() => {
    if (view !== "play") return;
    const timer = setInterval(() => setElapsed(carried.current + Date.now() - startedAt.current), 500);
    return () => clearInterval(timer);
  }, [view]);

  const persist = useCallback((next: Saved) => {
    setData(next);
    save(next);
  }, []);

  const slot = (e: Entry) => `${e.id}:${level}`;

  // A fresh grid with the level's revealed cells already in it.
  const startingMarks = (e: Entry, g: Givens) =>
    emptyMarks(e.puzzle).map((row, y) => row.map((_, x): Mark => {
      const given = givenAt(g, x, y);
      return given === undefined ? "" : given ? "fill" : "cross";
    }));

  const open = (e: Entry) => {
    const stored = data.progress[slot(e)];
    // Same face and level, same hints, on every device. Checked solvable by logic in hintsFor().
    const g = hintsFor(e.puzzle, level, slot(e));
    setGivens(g);
    setEntry(e);
    setMarks((stored && decodeMarks(e.puzzle, stored.marks)) || startingMarks(e, g));
    carried.current = stored?.ms ?? 0;
    startedAt.current = Date.now();
    setElapsed(carried.current);
    setCursor(null);
    setTool("fill");
    setView("play");
    play("case-button");
  };

  // Leaving a puzzle half done keeps it where it was, clock included.
  const leave = useCallback(() => {
    if (entry && view === "play") {
      const ms = carried.current + Date.now() - startedAt.current;
      persist({ ...data, progress: { ...data.progress, [slot(entry)]: { marks: encodeMarks(marks), ms } } });
    }
    setView("pick");
  }, [entry, view, marks, data, persist]);

  const paint = useCallback(
    (cells: [number, number][], value: Mark) => {
      if (!entry) return;
      play(value === "fill" ? "ui-pen" : value === "cross" ? "ui-key" : "ui-erase");
      const next = marksRef.current.map((row) => [...row]);
      cells.forEach(([x, y]) => (next[y][x] = value));
      marksRef.current = next;
      setMarks(next);
      if (isSolved(entry.puzzle, filledOf(next))) {
        const ms = carried.current + Date.now() - startedAt.current;
        const best = data.solved[slot(entry)];
        const progress = { ...data.progress };
        delete progress[slot(entry)];
        persist({ ...data, solved: { ...data.solved, [slot(entry)]: best ? Math.min(best, ms) : ms }, progress });
        setLastTime(ms);
        // Let the last cell show before the reveal.
        setTimeout(() => {
          play("stk-win");
          setView("solved");
        }, 250);
      }
    },
    [entry, data, persist],
  );

  // Keyboard: arrows move, space fills, x crosses, Esc steps back.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        if (view === "pick") onExit();
        else leave();
        return;
      }
      if (view === "pick") {
        if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
          e.preventDefault();
          setPage((p) => Math.min(pages - 1, Math.max(0, p + (e.key === "ArrowRight" ? 1 : -1))));
        }
        return;
      }
      if (view !== "play" || !entry) return;
      const moves: Record<string, [number, number]> = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0] };
      if (moves[e.key]) {
        e.preventDefault();
        setCursor((c) => {
          const [x, y] = c ?? [0, 0];
          const [dx, dy] = moves[e.key];
          return [Math.min(entry.puzzle.cols - 1, Math.max(0, x + dx)), Math.min(entry.puzzle.rows - 1, Math.max(0, y + dy))];
        });
      } else if ((e.key === " " || e.key.toLowerCase() === "x") && cursor && givenAt(givens, cursor[0], cursor[1]) === undefined) {
        e.preventDefault();
        const want: Mark = e.key === " " ? "fill" : "cross";
        paint([cursor], marks[cursor[1]][cursor[0]] === want ? "" : want);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [view, entry, cursor, marks, givens, paint, leave, onExit, pages]);

  const button = "px-[1.6cqh] py-[0.4cqh] border-[0.4cqh] border-(--fg) hover:bg-(--dim) disabled:opacity-40";
  const title = (e: Entry) => (e.guest ? e.guest.author : t.faceNames[e.faceIndex ?? 0]);
  const index = entry ? entries.findIndex((e) => e.id === entry.id) : -1;
  const next = index >= 0 ? entries[index + 1] : undefined;

  if (view === "play" && entry) {
    return (
      <div className={`absolute inset-0 flex ${tall ? "flex-col" : ""} gap-[2cqh] p-[3cqh]`}>
        <div className="flex-1 min-h-0 min-w-0">
          <Board entry={entry} marks={marks} givens={givens} tool={tool} cursor={cursor} onPaint={paint} />
        </div>
        <div className={`flex ${tall ? "flex-row flex-wrap justify-center items-center" : "flex-col w-[28%]"} gap-[1.5cqh] text-[0.8em]`}>
          <div className="tabular-nums text-[1.3em]">{clock(elapsed)}</div>
          <div className="opacity-70">
            {entry.puzzle.cols}×{entry.puzzle.rows}
          </div>
          {(["fill", "cross"] as const).map((m) => (
            <button key={m} onClick={() => setTool(m)} className={`${button} text-left ${tool === m ? INVERSE : ""}`} aria-pressed={tool === m}>
              {m === "fill" ? `■ ${t.fill}` : `× ${t.cross}`}
            </button>
          ))}
          <button
            onClick={() => {
              setMarks(startingMarks(entry, givens));
              play("ui-erase");
            }}
            className={`${button} text-left`}
          >
            {t.clear}
          </button>
          <button onClick={leave} className={`${button} text-left ${tall ? "" : "mt-auto"}`}>
            {t.puzzles}
          </button>
        </div>
      </div>
    );
  }

  if (view === "solved" && entry) {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-[2.2cqh] text-center px-[5cqh]">
        <div className="border-[0.5cqh] border-(--fg) p-[1cqh]">
          <FaceIcon art={entry.art} color={entry.color} accent={entry.accent} className={tall ? "w-[30cqw] h-[30cqw]" : "w-[28cqh] h-[28cqh]"} />
        </div>
        <div className="text-[1.3em]">{t.solvedIn(clock(lastTime))}</div>
        <div className="text-[0.85em] leading-[1.5] max-w-[44ch]">
          {entry.guest ? (
            <>
              <div className="opacity-80">{t.faceByName(entry.guest.author)}</div>
              {entry.guest.message && <div>"{entry.guest.message}"</div>}
            </>
          ) : (
            <div className="opacity-80">{t.pcFace(title(entry))}</div>
          )}
        </div>
        <div className="flex flex-wrap justify-center gap-[2cqh]">
          {entry.guest && (
            <button
              onClick={() => {
                wearFace(entry.guest!);
                play("pc-insert");
                onExit();
              }}
              className={button}
            >
              {t.showOnPc}
            </button>
          )}
          {next && (
            <button onClick={() => open(next)} className={`px-[1.6cqh] ${INVERSE}`}>
              {t.nextPuzzle}
            </button>
          )}
          <button onClick={() => setView("pick")} className={button}>
            {t.puzzles}
          </button>
        </div>
      </div>
    );
  }

  // The picker: solved ones show their face, the rest a question mark and their size.
  const shown = entries.slice(page * perPage, (page + 1) * perPage);
  const solvedCount = entries.filter((e) => data.solved[slot(e)] !== undefined).length;
  return (
    <div className="absolute inset-0 flex flex-col p-[3cqh] gap-[2cqh]">
      <div className="flex items-baseline justify-between gap-[2cqh]">
        <div className="text-[1.2em]">PICROSS</div>
        <div className="text-[0.75em] opacity-70 tabular-nums">{t.solvedCount(solvedCount, entries.length)}</div>
      </div>
      {/* Difficulty. Every level of every puzzle is checked solvable by logic, no guessing. */}
      <div className="flex gap-[1cqh] text-[0.8em]" role="group" aria-label={t.difficulty}>
        {LEVELS.map((lv) => (
          <button
            key={lv}
            aria-pressed={level === lv}
            onClick={() => {
              setLevel(lv);
              persist({ ...data, level: lv });
              play("case-button");
            }}
            className={`${button} ${level === lv ? INVERSE : ""}`}
          >
            {t.levels[lv]}
          </button>
        ))}
      </div>
      <div className={`flex-1 min-h-0 grid ${tall ? "grid-cols-3" : "grid-cols-5"} gap-[2cqh] content-start`}>
        {shown.map((e) => {
          const best = data.solved[slot(e)];
          const started = data.progress[slot(e)] !== undefined;
          return (
            <button
              key={e.id}
              onClick={() => open(e)}
              className="flex flex-col items-center gap-[0.6cqh] p-[0.8cqh] border-[0.3cqh] border-(--dim) hover:border-(--fg)"
            >
              <div className="w-full aspect-square max-w-[15cqh] flex items-center justify-center">
                {best !== undefined ? (
                  <FaceIcon art={e.art} color={e.color} accent={e.accent} className="w-full h-full" />
                ) : (
                  <span className="text-[2em] opacity-80">{started ? "…" : "?"}</span>
                )}
              </div>
              <span className="text-[0.62em] truncate max-w-full">
                {best !== undefined ? title(e) : `${e.puzzle.cols}×${e.puzzle.rows}`}
              </span>
              <span className="text-[0.55em] opacity-70 tabular-nums">
                {best !== undefined ? clock(best) : e.guest ? t.visitor : "HARO-PC"}
              </span>
            </button>
          );
        })}
      </div>
      <div className="flex items-center justify-between gap-[2cqh] text-[0.8em] min-h-[6cqh]">
        <span className="opacity-70">{visitors === undefined ? t.loading : visitors === null ? t.noVisitorPuzzles : ""}</span>
        {pages > 1 && (
          <div className="flex gap-[1cqh] items-center tabular-nums">
            <button className={button} disabled={page === 0} onClick={() => setPage((p) => p - 1)} aria-label={t.previousPage}>
              &lt;
            </button>
            {page + 1}/{pages}
            <button className={button} disabled={page >= pages - 1} onClick={() => setPage((p) => p + 1)} aria-label={t.nextPage}>
              &gt;
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

