import { useCallback, useEffect, useRef, useState } from "react";
import {
  COLS,
  VISIBLE_ROWS,
  SQUEEZE,
  newGame,
  stopAt,
  positionAt,
  startOf,
  tickMs,
  widthCap,
  cleanInitials,
  type StackState,
} from "@/lib/stacker";
import { startRun, submitScore, topScores, scoresPage, type ScoreRow, type ScorePage } from "@/lib/arcadeApi";
import { play, semitones } from "@/lib/sfx";
import PixelIcon from "@/components/PixelIcon";
import { PHOSPHOR, INVERSE } from "./phosphor";
import { strings } from "./strings";

type Phase = "title" | "playing" | "over" | "initials" | "saving" | "board";

interface Falling {
  col: number;
  row: number;
  born: number;
}

const AMBER = PHOSPHOR.amber;
// The stack scrolls down once the moving row gets this close to the top of the screen.
const HEADROOM = 6;
// Every tenth row gets a jingle and its number on screen.
const MILESTONE = 10;
// A beat between one row landing and the next one moving, so a double tap cannot drop two.
const ROW_PAUSE_MS = 170;
const INITIALS_KEY = "harogatos:initials";
const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

const pad = (n: number, width: number) => String(n).padStart(width, "0");

// Every row a semitone up, so a good run climbs a scale, and back to the bottom note every octave
// so a long run does not end up squeaking. The sounds are recorded at the bottom note.
const sfx = {
  start: () => play("stk-start"),
  place: (row: number) => play("stk-place", { rate: semitones(row % 12) }),
  perfect: (row: number) => play("stk-perfect", { rate: semitones(row % 12) }),
  chop: () => play("stk-chop"),
  over: () => play("stk-over"),
  milestone: () => play("stk-win", { volume: 0.7 }),
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

function Board({
  rows,
  first = 1,
  highlight,
  offline,
}: {
  rows: ScoreRow[] | null;
  /** The rank of the first row, so later pages keep counting from where the last one ended. */
  first?: number;
  highlight?: number;
  offline?: boolean;
}) {
  const t = strings();
  if (offline || rows === null) {
    return (
      <div className="text-center opacity-90 leading-[1.6]">
        <div>{t.noSignal}</div>
        <div className="text-[0.75em] opacity-80">{t.scoreboardHome}</div>
      </div>
    );
  }
  if (rows.length === 0) {
    return (
      <div className="text-center leading-[1.6]">
        <div>{t.nobodyYet}</div>
        <div className="text-[0.75em] opacity-80">{t.topSpotYours}</div>
      </div>
    );
  }
  return (
    <table className="mx-auto border-collapse tabular-nums [&_td]:px-[1.3cqh] [&_th]:px-[1.3cqh]">
      <thead>
        <tr className="text-[0.7em] opacity-70">
          <th className="text-right font-normal">#</th>
          <th className="text-left font-normal">{t.who}</th>
          <th className="text-right font-normal">{t.scoreCol}</th>
          <th className="text-right font-normal">{t.rowsCol}</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => (
          <tr key={`${row.initials}-${row.at}-${i}`} className={first + i === highlight ? `${INVERSE} crt-led` : ""}>
            <td className="text-right">{first + i}</td>
            <td>{row.initials}</td>
            <td className="text-right">{pad(row.score, 4)}</td>
            <td className="text-right">{pad(row.rows, 2)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// Every score anyone saved, ten to a page. Left and right turn the page.
export function Hiscores({ onExit }: { onExit: () => void }) {
  const [page, setPage] = useState(0);
  const [data, setData] = useState<ScorePage | null | undefined>(undefined);

  useEffect(() => {
    let live = true;
    setData(undefined);
    scoresPage(page).then((next) => live && setData(next));
    return () => {
      live = false;
    };
  }, [page]);

  const pages = data?.pages ?? 1;
  const turn = useCallback((step: number) => setPage((p) => Math.min(pages - 1, Math.max(0, p + step))), [pages]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
        e.preventDefault();
        turn(e.key === "ArrowRight" ? 1 : -1);
      } else if (e.key === "Escape" || e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        onExit();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onExit, turn]);

  const arrow = "px-[1.4cqh] border-[0.4cqh] border-(--fg) hover:bg-(--dim) disabled:opacity-30";
  const t = strings();

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-[3cqh]">
      <div className="text-[1.2em]">{t.bestStackers}</div>
      {data === undefined ? (
        <div>{t.loading}</div>
      ) : (
        <Board rows={data?.top ?? null} first={page * (data?.perPage ?? 10) + 1} />
      )}
      {data && data.pages > 1 && (
        <div className="flex items-center gap-[2cqh] tabular-nums text-[0.85em]">
          <button className={arrow} disabled={page === 0} onClick={() => turn(-1)} aria-label={t.previousPage}>
            &lt;
          </button>
          <span>
            {page + 1}/{data.pages}
          </span>
          <button className={arrow} disabled={page >= data.pages - 1} onClick={() => turn(1)} aria-label={t.nextPage}>
            &gt;
          </button>
        </div>
      )}
    </div>
  );
}

// --- initials --------------------------------------------------------------------------------

function Initials({ onSave, onSkip, rejected }: { onSave: (initials: string) => void; onSkip: () => void; rejected: boolean }) {
  const [letters, setLetters] = useState(savedInitials);
  const [slot, setSlot] = useState(0);
  const t = strings();

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
      <div>{t.signYourScore}</div>
      <div className="flex gap-[2.5cqh]">
        {letters.map((letter, i) => (
          <div key={i} className="flex flex-col items-center">
            <button className={arrow} onClick={() => spin(i, 1)} aria-label={t.letterUp(i + 1)}>
              <PixelIcon name="chevron-up" className="w-[4cqh] h-[4cqh]" />
            </button>
            <button
              onClick={() => setSlot(i)}
              className={`w-[7cqh] text-center text-[2em] leading-[1.1] border-b-[0.6cqh] ${
                i === slot ? "border-(--fg) crt-led" : "border-transparent"
              }`}
              aria-label={t.letter(i + 1, letter)}
            >
              {letter}
            </button>
            <button className={arrow} onClick={() => spin(i, -1)} aria-label={t.letterDown(i + 1)}>
              <PixelIcon name="chevron-down" className="w-[4cqh] h-[4cqh]" />
            </button>
          </div>
        ))}
      </div>
      {rejected && <div className="text-[0.75em]">{t.pickOtherLetters}</div>}
      <div className="flex gap-[3cqh]">
        <button onClick={save} className={`px-[2cqh] ${INVERSE}`}>
          {t.save}
        </button>
        <button onClick={onSkip} className="px-[2cqh] border-[0.4cqh] border-(--fg)">
          {t.skip}
        </button>
      </div>
    </div>
  );
}

// --- the game --------------------------------------------------------------------------------

export default function Stacker({ onExit, tall = false }: { onExit: () => void; tall?: boolean }) {
  // One language per page load, so the callbacks below can close over it.
  const t = strings();
  const [phase, setPhase] = useState<Phase>("title");
  const [score, setScore] = useState(0);
  const [row, setRow] = useState(0);
  const [flash, setFlash] = useState<string | null>(null);
  const [board, setBoard] = useState<ScoreRow[] | null>(null);
  // Rank of the board's first row. After a save it is the page the new score landed on.
  const [boardFirst, setBoardFirst] = useState(1);
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
    // The tick each row was stopped at. This is what the Worker replays.
    ticks: [] as number[],
    falling: [] as Falling[],
    endedAt: 0,
    perfectRow: -1,
    perfectAt: 0,
    // How far the stack has scrolled down, in rows. It glides toward where it should be.
    camera: 0,
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
    g.ticks = [];
    g.falling = [];
    g.rowStart = performance.now() + 450;
    g.endedAt = 0;
    g.perfectRow = -1;
    g.camera = 0;
    setScore(0);
    setRow(0);
    setRank(undefined);
    setRejected(false);
    setOffline(false);
    // Ask for a run id now, so the server's clock starts when the game does.
    run.current = startRun();
    go("playing");
    say(t.ready, 450);
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
    const tick = Math.floor((now - g.rowStart) / tickMs(current));
    const result = stopAt(g.state, tick);
    g.ticks.push(tick);
    g.state = result.state;

    result.lost.forEach((col) => g.falling.push({ col, row: current, born: now }));
    if (result.lost.length) sfx.chop();

    if (result.state.over) {
      g.endedAt = now;
      setScore(result.state.score);
      setRow(result.state.stack.length);
      go("over");
      sfx.over();
      say(t.gameOver, 1600);
      setTimeout(finish, 1600);
      return;
    }

    if (result.perfect) {
      g.perfectRow = current;
      g.perfectAt = now;
      sfx.perfect(current);
      say(t.perfectPlus(result.gained), 700);
    } else {
      sfx.place(current);
      say(`+${result.gained}`, 500);
    }
    const rows = current + 1;
    if (rows % MILESTONE === 0) {
      sfx.milestone();
      say(`${t.row} ${rows}`, 900);
    }
    // Losing width to the squeeze, not to a miss, deserves a heads up.
    if (widthCap(rows) < widthCap(current) && result.state.width === widthCap(rows)) {
      say(t.blocksLeft(result.state.width), 900);
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
    const result = id ? await submitScore(id, clean, game.current.ticks) : null;
    if (result) {
      setBoard(result.top);
      setBoardFirst(result.page * result.perPage + 1);
      if (result.page === 0) setBest(result.top[0] ?? null);
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
      cell = Math.max(4, Math.floor(Math.min(height / VISIBLE_ROWS, (width || Infinity) / COLS)));
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.style.width = `${cell * COLS}px`;
      canvas.style.height = `${cell * VISIBLE_ROWS}px`;
      canvas.width = cell * COLS * dpr;
      canvas.height = cell * VISIBLE_ROWS * dpr;
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
    let last = performance.now();
    const draw = () => {
      const now = performance.now();
      const g = game.current;
      const p = phaseRef.current;
      const width = COLS * cell;
      const height = VISIBLE_ROWS * cell;

      // Scroll so the moving row never gets closer than HEADROOM rows to the top, easing there
      // over about a fifth of a second.
      const goal = p === "title" ? 0 : Math.max(0, g.state.stack.length - (VISIBLE_ROWS - HEADROOM));
      g.camera += (goal - g.camera) * (1 - Math.exp(-(now - last) / 70));
      if (Math.abs(goal - g.camera) < 0.01) g.camera = goal;
      last = now;
      const cam = g.camera;
      // Screen y of the top of a row of the stack, counted from the bottom.
      const yOf = (row: number) => VISIBLE_ROWS - 1 - row + cam;

      ctx.clearRect(0, 0, width, height);

      // The empty playfield: a dot in every cell, and marks where the row gets narrower.
      ctx.fillStyle = AMBER.dim;
      for (let r = Math.floor(cam); r <= cam + VISIBLE_ROWS; r++) {
        const y = yOf(r) * cell + cell / 2 - 1;
        for (let c = 0; c < COLS; c++) ctx.fillRect(c * cell + cell / 2 - 1, y, 2, 2);
      }
      SQUEEZE.forEach((row, i) => {
        const y = yOf(row - 1);
        if (y > 0.5 && y < VISIBLE_ROWS) dashed(y, t.max(2 - i));
      });

      // A demo stack on the title screen, so it is obvious what the game is.
      const stack = p === "title" ? [{ x: 3, width: 3 }, { x: 3, width: 3 }, { x: 4, width: 2 }] : g.state.stack;

      const sinceEnd = g.endedAt ? now - g.endedAt : 0;
      stack.forEach((placed, r) => {
        const y = yOf(r);
        if (y > VISIBLE_ROWS) return;
        let alpha = 1;
        let color: string = AMBER.fg;
        if (p === "title") alpha = 0.5;
        if (g.endedAt && sinceEnd < 1500) alpha = Math.floor(sinceEnd / 150) % 2 ? 0.25 : 1;
        if (r === g.perfectRow && now - g.perfectAt < 260) color = "#FFF3C4";
        for (let c = placed.x; c < placed.x + placed.width; c++) block(c, y, color, alpha);
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
        for (let c = x; c < x + w; c++) block(c, yOf(current), "#FFD166", alpha);
      }

      // Whatever missed, dropping off the bottom.
      g.falling = g.falling.filter((f) => {
        const t = (now - f.born) / 1000;
        const y = yOf(f.row) + 22 * t * t;
        if (y > VISIBLE_ROWS + 1) return false;
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
            {t.stackerHow}
          </div>
          <div className="crt-led">{t.pressSpaceOrTap}</div>
          <div className="text-[0.75em] opacity-70">{t.best} {bestText}</div>
        </>
      )}
      {phase === "initials" && (
        <>
          <div className="text-[0.8em] opacity-80 tabular-nums">
            {t.pointsAndRows(pad(score, 4), row)}
          </div>
          <Initials onSave={save} onSkip={() => go("board")} rejected={rejected} />
        </>
      )}
      {phase === "saving" && <div className="crt-led">{t.saving}</div>}
      {phase === "board" && (
        <>
          <div>{rank ? t.youPlaced(rank) : t.points(pad(score, 4))}</div>
          {/* A score that could not be signed says why, instead of skipping the step silently. */}
          {offline && score > 0 && (
            <div className="text-[0.75em] opacity-80">
              {/(^|\.)fharo\.dev$/.test(location.hostname) ? t.notSaved : t.onlyOnSite}
            </div>
          )}
          <Board rows={board} first={boardFirst} highlight={rank} offline={offline && !board} />
          <div className="text-[0.75em] opacity-70 crt-led">
            {tall ? t.tapToPlayAgain : t.spaceToPlayAgain}
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
            <span className="text-[0.7em] opacity-70">{t.score} </span>
            {pad(score, 4)}
          </span>
          <span>
            <span className="text-[0.7em] opacity-70">{t.row} </span>
            {pad(row, 2)}
          </span>
          <span>
            <span className="text-[0.7em] opacity-70">{t.best} </span>
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
              <div className="text-[0.7em] opacity-70">{t.score}</div>
              <div className="text-[1.6em] leading-none tabular-nums">{pad(score, 4)}</div>
            </div>
            <div>
              <div className="text-[0.7em] opacity-70">{t.row}</div>
              <div className="tabular-nums">{pad(row, 2)}</div>
            </div>
            <div>
              <div className="text-[0.7em] opacity-70">{t.best}</div>
              <div className="tabular-nums">{bestText}</div>
            </div>
            <div className="mt-auto text-[0.7em] opacity-70 leading-normal">
              {phase === "over" ? t.missed : t.spaceOrTapToStop}
            </div>
          </div>
        ) : (
          panel
        )}
      </div>
    </div>
  );
}
