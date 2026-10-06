import { useCallback, useEffect, useRef, useState } from "react";
import {
  COLS,
  ROWS,
  newGame,
  placeRow,
  positionAt,
  startOf,
  tickMs,
  widthCap,
  cleanInitials,
  type StackState,
} from "@/lib/stacker";
import { startRun, submitScore, topScores, type ScoreRow } from "@/lib/arcadeApi";
import { play, semitones } from "@/lib/sfx";
import PixelIcon from "@/components/PixelIcon";
import { PHOSPHOR, INVERSE } from "./phosphor";

type Phase = "title" | "playing" | "over" | "initials" | "saving" | "board";

interface Falling {
  col: number;
  row: number;
  born: number;
}

const AMBER = PHOSPHOR.amber;
// Rows of the stack light up one by one when you reach the top.
const WIN_WAVE_MS = 70;
// A beat between one row landing and the next one moving, so a double tap cannot drop two.
const ROW_PAUSE_MS = 170;
const INITIALS_KEY = "harogatos:initials";
const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

const pad = (n: number, width: number) => String(n).padStart(width, "0");

// Every row a semitone up, so a good run climbs a scale. The sounds are recorded at the bottom note.
const sfx = {
  start: () => play("stk-start"),
  place: (row: number) => play("stk-place", { rate: semitones(row) }),
  perfect: (row: number) => play("stk-perfect", { rate: semitones(row) }),
  chop: () => play("stk-chop"),
  over: () => play("stk-over"),
  win: () => play("stk-win"),
  key: () => play("ui-key"),
};

function savedInitials(): string[] {
  try {
    const value = localStorage.getItem(INITIALS_KEY);
    if (value && /^[A-Z]{3}$/.test(value)) return value.split("");
  } catch {
    // No storage, start from AAA.
  }
  return ["A", "A", "A"];
}

// --- the board -------------------------------------------------------------------------------

function Board({ rows, highlight, offline }: { rows: ScoreRow[] | null; highlight?: number; offline?: boolean }) {
  if (offline || rows === null) {
    return (
      <div className="text-center opacity-90 leading-[1.6]">
        <div>NO SIGNAL</div>
        <div className="text-[0.75em] opacity-80">the scoreboard lives on fharo.dev</div>
      </div>
    );
  }
  if (rows.length === 0) {
    return (
      <div className="text-center leading-[1.6]">
        <div>NOBODY YET</div>
        <div className="text-[0.75em] opacity-80">the top spot is yours</div>
      </div>
    );
  }
  return (
    <table className="mx-auto border-collapse tabular-nums [&_td]:px-[1.3cqh] [&_th]:px-[1.3cqh]">
      <thead>
        <tr className="text-[0.7em] opacity-70">
          <th className="text-right font-normal">#</th>
          <th className="text-left font-normal">WHO</th>
          <th className="text-right font-normal">SCORE</th>
          <th className="text-right font-normal">ROWS</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => (
          <tr key={`${row.initials}-${row.at}-${i}`} className={i + 1 === highlight ? `${INVERSE} crt-led` : ""}>
            <td className="text-right">{i + 1}</td>
            <td>{row.initials}</td>
            <td className="text-right">{pad(row.score, 4)}</td>
            <td className="text-right">{pad(row.rows, 2)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function Hiscores({ onExit }: { onExit: () => void }) {
  const [rows, setRows] = useState<ScoreRow[] | null | undefined>(undefined);

  useEffect(() => {
    topScores().then(setRows);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" || e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        onExit();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onExit]);

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-[3cqh]">
      <div className="text-[1.2em]">BEST STACKERS</div>
      {rows === undefined ? <div>LOADING...</div> : <Board rows={rows} />}
    </div>
  );
}

// --- initials --------------------------------------------------------------------------------

function Initials({ onSave, onSkip, rejected }: { onSave: (initials: string) => void; onSkip: () => void; rejected: boolean }) {
  const [letters, setLetters] = useState(savedInitials);
  const [slot, setSlot] = useState(0);

  const spin = useCallback((i: number, delta: number) => {
    setLetters((current) => {
      const next = [...current];
      next[i] = LETTERS[(LETTERS.indexOf(next[i]) + delta + LETTERS.length) % LETTERS.length];
      return next;
    });
    sfx.key();
  }, []);

  const save = useCallback(() => onSave(letters.join("")), [letters, onSave]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const key = e.key;
      if (/^[a-zA-Z]$/.test(key)) {
        e.preventDefault();
        setLetters((current) => {
          const next = [...current];
          next[slot] = key.toUpperCase();
          return next;
        });
        setSlot((s) => Math.min(2, s + 1));
        sfx.key();
      } else if (key === "ArrowUp" || key === "ArrowDown") {
        e.preventDefault();
        spin(slot, key === "ArrowUp" ? 1 : -1);
      } else if (key === "ArrowLeft" || key === "Backspace") {
        e.preventDefault();
        setSlot((s) => Math.max(0, s - 1));
      } else if (key === "ArrowRight") {
        e.preventDefault();
        setSlot((s) => Math.min(2, s + 1));
      } else if (key === "Enter") {
        e.preventDefault();
        save();
      } else if (key === "Escape") {
        e.preventDefault();
        onSkip();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [slot, spin, save, onSkip]);

  const arrow = "w-[7cqh] h-[5cqh] flex items-center justify-center hover:bg-(--dim)";

  return (
    <div className="flex flex-col items-center gap-[2cqh]">
      <div>SIGN YOUR SCORE</div>
      <div className="flex gap-[2.5cqh]">
        {letters.map((letter, i) => (
          <div key={i} className="flex flex-col items-center">
            <button className={arrow} onClick={() => spin(i, 1)} aria-label={`Letter ${i + 1} up`}>
              <PixelIcon name="chevron-up" className="w-[4cqh] h-[4cqh]" />
            </button>
            <button
              onClick={() => setSlot(i)}
              className={`w-[7cqh] text-center text-[2em] leading-[1.1] border-b-[0.6cqh] ${
                i === slot ? "border-(--fg) crt-led" : "border-transparent"
              }`}
              aria-label={`Letter ${i + 1}: ${letter}`}
            >
              {letter}
            </button>
            <button className={arrow} onClick={() => spin(i, -1)} aria-label={`Letter ${i + 1} down`}>
              <PixelIcon name="chevron-down" className="w-[4cqh] h-[4cqh]" />
            </button>
          </div>
        ))}
      </div>
      {rejected && <div className="text-[0.75em]">PICK SOME OTHER LETTERS</div>}
      <div className="flex gap-[3cqh]">
        <button onClick={save} className={`px-[2cqh] ${INVERSE}`}>
          SAVE
        </button>
        <button onClick={onSkip} className="px-[2cqh] border-[0.4cqh] border-(--fg)">
          SKIP
        </button>
      </div>
    </div>
  );
}

// --- the game --------------------------------------------------------------------------------

export default function Stacker({ onExit, tall = false }: { onExit: () => void; tall?: boolean }) {
  const [phase, setPhase] = useState<Phase>("title");
  const [score, setScore] = useState(0);
  const [row, setRow] = useState(0);
  const [flash, setFlash] = useState<string | null>(null);
  const [won, setWon] = useState(false);
  const [board, setBoard] = useState<ScoreRow[] | null>(null);
  const [best, setBest] = useState<ScoreRow | null>(null);
  const [rank, setRank] = useState<number | undefined>(undefined);
  const [offline, setOffline] = useState(false);
  const [rejected, setRejected] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fieldRef = useRef<HTMLDivElement>(null);
  const phaseRef = useRef<Phase>("title");
  const game = useRef({
    state: newGame() as StackState,
    rowStart: 0,
    moves: [] as number[],
    falling: [] as Falling[],
    endedAt: 0,
    perfectRow: -1,
    perfectAt: 0,
  });
  const run = useRef<Promise<string | null> | null>(null);
  const flashTimer = useRef<ReturnType<typeof setTimeout>>();

  const go = (next: Phase) => {
    phaseRef.current = next;
    setPhase(next);
  };

  useEffect(() => {
    topScores().then((top) => {
      setBoard(top);
      setBest(top?.[0] ?? null);
    });
  }, []);

  const say = (text: string, ms = 700) => {
    setFlash(text);
    clearTimeout(flashTimer.current);
    flashTimer.current = setTimeout(() => setFlash(null), ms);
  };

  const start = useCallback(() => {
    const g = game.current;
    g.state = newGame();
    g.moves = [];
    g.falling = [];
    g.rowStart = performance.now() + 450;
    g.endedAt = 0;
    g.perfectRow = -1;
    setScore(0);
    setRow(0);
    setWon(false);
    setRank(undefined);
    setRejected(false);
    setOffline(false);
    // Ask for a run id now, so the server's clock starts when the game does.
    run.current = startRun();
    go("playing");
    say("READY", 450);
    sfx.start();
  }, []);

  const finish = useCallback(async () => {
    const g = game.current;
    if (g.state.score === 0) return go("board");
    const id = await run.current;
    if (!id) {
      setOffline(true);
      return go("board");
    }
    go("initials");
  }, []);

  const drop = useCallback(() => {
    const g = game.current;
    const now = performance.now();
    if (phaseRef.current !== "playing" || now < g.rowStart) return;

    const current = g.state.stack.length;
    const x = positionAt(current, g.state.width, Math.floor((now - g.rowStart) / tickMs(current)));
    const result = placeRow(g.state, x);
    g.moves.push(x);
    g.state = result.state;

    result.lost.forEach((col) => g.falling.push({ col, row: current, born: now }));
    if (result.lost.length) sfx.chop();

    if (result.state.over) {
      g.endedAt = now;
      setScore(result.state.score);
      setRow(result.state.stack.length);
      setWon(result.state.won);
      go("over");
      if (result.state.won) {
        sfx.win();
        say("YOU MADE IT!", 2400);
      } else {
        sfx.over();
        say("GAME OVER", 1600);
      }
      setTimeout(finish, result.state.won ? 2400 : 1600);
      return;
    }

    if (result.perfect) {
      g.perfectRow = current;
      g.perfectAt = now;
      sfx.perfect(current);
      say("PERFECT!", 600);
    } else {
      sfx.place(current);
    }
    // Losing width to the squeeze, not to a miss, deserves a heads up.
    if (widthCap(current + 1) < widthCap(current) && result.state.width === widthCap(current + 1)) {
      say(`${result.state.width} BLOCK${result.state.width > 1 ? "S" : ""} LEFT`, 800);
    }
    g.rowStart = now + ROW_PAUSE_MS;
    setScore(result.state.score);
    setRow(result.state.stack.length);
  }, [finish]);

  const save = useCallback(async (initials: string) => {
    const clean = cleanInitials(initials);
    if (!clean) {
      setRejected(true);
      return;
    }
    try {
      localStorage.setItem(INITIALS_KEY, clean);
    } catch {
      // Not remembered, not a problem.
    }
    go("saving");
    const id = await run.current;
    const result = id ? await submitScore(id, clean, game.current.moves) : null;
    if (result) {
      setBoard(result.top);
      setBest(result.top[0] ?? null);
      setRank(result.rank);
    } else {
      setOffline(true);
    }
    go("board");
  }, []);

  // One input for everything: space, enter, a click or a tap.
  const press = useCallback(() => {
    const p = phaseRef.current;
    if (p === "playing") drop();
    else if (p === "title" || p === "board") start();
  }, [drop, start]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const p = phaseRef.current;
      if (p === "initials") return;
      if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        if (!e.repeat) press();
      } else if (e.key === "Escape") {
        e.preventDefault();
        onExit();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [press, onExit]);

  // --- drawing -------------------------------------------------------------------------------

  useEffect(() => {
    const canvas = canvasRef.current;
    const field = fieldRef.current;
    if (!canvas || !field) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let cell = 10;
    const fit = () => {
      // clientHeight counts the padding, and the canvas has to fit inside it.
      const style = getComputedStyle(field);
      const height = field.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom);
      const width = field.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
      cell = Math.max(4, Math.floor(Math.min(height / ROWS, (width || Infinity) / COLS)));
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.style.width = `${cell * COLS}px`;
      canvas.style.height = `${cell * ROWS}px`;
      canvas.width = cell * COLS * dpr;
      canvas.height = cell * ROWS * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(field);

    const block = (col: number, y: number, color: string, alpha = 1) => {
      const inset = Math.max(1, Math.round(cell / 12));
      ctx.globalAlpha = alpha;
      ctx.fillStyle = color;
      ctx.shadowColor = color;
      ctx.shadowBlur = cell * 0.6;
      ctx.fillRect(col * cell + inset, y * cell + inset, cell - inset * 2, cell - inset * 2);
      ctx.globalAlpha = 1;
      ctx.shadowBlur = 0;
    };

    const dashed = (y: number, label: string) => {
      ctx.strokeStyle = AMBER.dim;
      ctx.lineWidth = 1;
      ctx.setLineDash([cell * 0.3, cell * 0.3]);
      ctx.beginPath();
      ctx.moveTo(0, y * cell + 0.5);
      ctx.lineTo(COLS * cell, y * cell + 0.5);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = AMBER.dim;
      ctx.font = `${Math.round(cell * 0.55)}px "Ubuntu Mono", monospace`;
      ctx.textAlign = "right";
      ctx.textBaseline = "bottom";
      ctx.fillText(label, COLS * cell - 2, y * cell - 1);
    };

    let raf = 0;
    const draw = () => {
      const now = performance.now();
      const g = game.current;
      const p = phaseRef.current;
      const width = COLS * cell;
      const height = ROWS * cell;

      ctx.clearRect(0, 0, width, height);

      // The empty playfield: a dot in every cell, and marks where the row gets narrower.
      ctx.fillStyle = AMBER.dim;
      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          ctx.fillRect(c * cell + cell / 2 - 1, r * cell + cell / 2 - 1, 2, 2);
        }
      }
      dashed(ROWS - 6, "MAX 2");
      dashed(ROWS - 11, "MAX 1");

      // A demo stack on the title screen, so it is obvious what the game is.
      const stack = p === "title" ? [{ x: 3, width: 3 }, { x: 3, width: 3 }, { x: 4, width: 2 }] : g.state.stack;

      const sinceEnd = g.endedAt ? now - g.endedAt : 0;
      stack.forEach((placed, r) => {
        let alpha = 1;
        let color: string = AMBER.fg;
        if (p === "title") alpha = 0.5;
        if (g.endedAt && !g.state.won && sinceEnd < 1500) alpha = Math.floor(sinceEnd / 150) % 2 ? 0.25 : 1;
        if (g.endedAt && g.state.won) {
          const lit = Math.floor(sinceEnd / WIN_WAVE_MS) % (ROWS + 4);
          color = Math.abs(lit - r) < 2 ? "#FFF3C4" : AMBER.fg;
        }
        if (r === g.perfectRow && now - g.perfectAt < 260) color = "#FFF3C4";
        for (let c = placed.x; c < placed.x + placed.width; c++) block(c, ROWS - 1 - r, color, alpha);
      });

      // The row that is moving.
      if (p === "playing") {
        const current = g.state.stack.length;
        const w = g.state.width;
        const x =
          now < g.rowStart
            ? startOf(current, w).x
            : positionAt(current, w, Math.floor((now - g.rowStart) / tickMs(current)));
        const alpha = now < g.rowStart ? 0.45 : 1;
        for (let c = x; c < x + w; c++) block(c, ROWS - 1 - current, "#FFD166", alpha);
      }

      // Whatever missed, dropping off the bottom.
      g.falling = g.falling.filter((f) => {
        const t = (now - f.born) / 1000;
        const y = ROWS - 1 - f.row + 22 * t * t;
        if (y > ROWS + 1) return false;
        block(f.col, y, AMBER.fg, Math.max(0, 1 - t * 1.4));
        return true;
      });

      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
    };
    // A phone turned sideways swaps layouts, and with them the canvas this draws into.
  }, [tall]);

  useEffect(() => () => clearTimeout(flashTimer.current), []);

  const overlay =
    phase === "title" || phase === "initials" || phase === "saving" || phase === "board";

  const bestText = best ? `${best.initials} ${pad(best.score, 4)}` : "---";

  // Title, initials and the board. Beside the playfield on a wide tube, over it on a tall one.
  const panel = (
    <div className="flex flex-col items-center justify-center gap-[3cqh] h-full text-center">
      {phase === "title" && (
        <>
          <div className="text-[2.2em] leading-none">STACKER</div>
          <div className="text-[0.8em] opacity-80 leading-normal max-w-[40ch]">
            Stop each row on top of the last. Whatever hangs over the edge falls off.
          </div>
          <div className="crt-led">PRESS SPACE OR TAP</div>
          <div className="text-[0.75em] opacity-70">BEST {bestText}</div>
        </>
      )}
      {phase === "initials" && (
        <>
          <div className="text-[0.8em] opacity-80 tabular-nums">
            {pad(score, 4)} POINTS · {row} ROWS
          </div>
          <Initials onSave={save} onSkip={() => go("board")} rejected={rejected} />
        </>
      )}
      {phase === "saving" && <div className="crt-led">SAVING...</div>}
      {phase === "board" && (
        <>
          <div>{rank ? `YOU PLACED #${rank}` : `${pad(score, 4)} POINTS`}</div>
          {/* A score that could not be signed says why, instead of skipping the step silently. */}
          {offline && score > 0 && (
            <div className="text-[0.75em] opacity-80">
              {/(^|\.)fharo\.dev$/.test(location.hostname) ? "NO SIGNAL. THIS ONE WASN'T SAVED." : "SCORES ONLY SAVE ON FHARO.DEV"}
            </div>
          )}
          <Board rows={board} highlight={rank && rank <= 10 ? rank : undefined} offline={offline && !board} />
          <div className="text-[0.75em] opacity-70 crt-led">
            {tall ? "TAP TO PLAY AGAIN" : "SPACE TO PLAY AGAIN"}
          </div>
        </>
      )}
    </div>
  );

  const playfield = (
    <div className="relative border-x-[0.5cqh] border-(--dim)">
      <canvas ref={canvasRef} className="block" />
      {flash && (
        <div className="absolute inset-x-0 top-[38%] text-center text-[1.15em] whitespace-nowrap pointer-events-none">
          <span className="px-[1cqh] bg-(--bg)">{flash}</span>
        </div>
      )}
    </div>
  );

  const onPointerDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest("button")) return;
    press();
  };

  if (tall) {
    return (
      <div className="absolute inset-0 flex flex-col cursor-pointer" onPointerDown={onPointerDown}>
        <div className="flex justify-between gap-[2cqw] px-[4cqw] py-[1.5cqh] border-b-[0.4cqh] border-(--dim) tabular-nums">
          <span>
            <span className="text-[0.7em] opacity-70">SCORE </span>
            {pad(score, 4)}
          </span>
          <span>
            <span className="text-[0.7em] opacity-70">ROW </span>
            {pad(row, 2)}
          </span>
          <span>
            <span className="text-[0.7em] opacity-70">BEST </span>
            {best ? pad(best.score, 4) : "---"}
          </span>
        </div>
        <div ref={fieldRef} className="relative flex-1 min-h-0 py-[2.5cqh] flex items-center justify-center">
          {playfield}
          {overlay && (
            <div className="absolute inset-0 px-[5cqw] bg-[color-mix(in_srgb,var(--bg)_86%,transparent)]">
              {panel}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="absolute inset-0 flex cursor-pointer" onPointerDown={onPointerDown}>
      <div ref={fieldRef} className="relative h-full py-[5cqh] pl-[9cqh] flex items-center">
        {playfield}
      </div>

      <div className="flex-1 min-w-0 flex flex-col py-[4cqh] px-[5cqh]">
        {!overlay ? (
          <div className="flex flex-col gap-[2.5cqh] h-full">
            <div className="text-[1.5em] leading-none">STACKER</div>
            <div>
              <div className="text-[0.7em] opacity-70">SCORE</div>
              <div className="text-[1.6em] leading-none tabular-nums">{pad(score, 4)}</div>
            </div>
            <div>
              <div className="text-[0.7em] opacity-70">ROW</div>
              <div className="tabular-nums">
                {pad(row, 2)}/{ROWS}
              </div>
            </div>
            <div>
              <div className="text-[0.7em] opacity-70">BEST</div>
              <div className="tabular-nums">{bestText}</div>
            </div>
            <div className="mt-auto text-[0.7em] opacity-70 leading-normal">
              {phase === "over" ? (won ? "TOP OF THE STACK" : "THAT ONE MISSED") : "SPACE OR TAP TO STOP"}
            </div>
          </div>
        ) : (
          panel
        )}
      </div>
    </div>
  );
}
