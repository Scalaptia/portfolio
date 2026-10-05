import { useCallback, useEffect, useRef, useState } from "react";
import {
  FACE_SIZE,
  SCHEMES,
  AUTHOR_MAX,
  MESSAGE_MAX,
  MIN_LIT,
  cleanArt,
  cleanText,
  emptyArt,
  type GuestFace,
  type SchemeName,
} from "@/lib/guestFaces";
import { fetchFaces, sendFace } from "@/lib/arcadeApi";
import { rememberMyFace } from "@/lib/guestFaceShow";
import { CRT_COLORS, guestFace } from "@/components/pc-model/faces";
import { playNotes } from "@/components/pc-model/sounds";
import FaceIcon from "./FaceIcon";
import { INVERSE } from "./phosphor";

// FACES.EXE. Draw a face for the PC, sign it, send it. It goes into a queue, Fernando approves it
// or not, and approved faces take turns on the PC for everyone. Yours shows up for you at once.

type View = "draw" | "sign" | "sent" | "gallery";
type Tool = "#" | "@" | ".";

const DRAFT_KEY = "harogatos:face-draft";
const GALLERY_PAGE = { wide: 10, tall: 9 };

const TOOLS: { id: Tool; label: string }[] = [
  { id: "#", label: "PEN" },
  { id: "@", label: "BLUSH" },
  { id: ".", label: "ERASE" },
];

const ERRORS: Record<string, string> = {
  "slow-down": "THAT'S A LOT OF FACES. TRY AGAIN IN AN HOUR.",
  offline: "NO SIGNAL. YOUR DRAWING IS SAVED, TRY AGAIN LATER.",
  author: "SIGN WITH A NAME, UP TO 20 CHARACTERS.",
  message: "KEEP THE NOTE UNDER 80 CHARACTERS.",
  art: "DRAW A LITTLE MORE FIRST.",
};

const blip = (freq = 880) => playNotes([[freq, 0, 0.03]], 0.04);

interface Draft {
  art: string[];
  scheme: SchemeName;
  author: string;
  message: string;
}

function loadDraft(): Draft {
  try {
    const raw = JSON.parse(localStorage.getItem(DRAFT_KEY) ?? "null");
    if (raw && Array.isArray(raw.art) && raw.art.length === FACE_SIZE) {
      return {
        art: raw.art,
        scheme: SCHEMES.includes(raw.scheme) ? raw.scheme : "green",
        author: typeof raw.author === "string" ? raw.author : "",
        message: typeof raw.message === "string" ? raw.message : "",
      };
    }
  } catch {
    // A broken draft is no draft.
  }
  return { art: emptyArt(), scheme: "green", author: "", message: "" };
}

const litCount = (art: string[]) => art.join("").replace(/\./g, "").length;

function setCell(art: string[], x: number, y: number, value: Tool, mirror: boolean): string[] {
  const next = [...art];
  const put = (cx: number) => {
    const row = next[y];
    next[y] = row.slice(0, cx) + value + row.slice(cx + 1);
  };
  put(x);
  if (mirror) put(FACE_SIZE - 1 - x);
  return next;
}

// Every cell a line passes through, so a fast drag does not leave gaps.
function cellsBetween(a: [number, number], b: [number, number]): [number, number][] {
  const cells: [number, number][] = [];
  let [x0, y0] = a;
  const [x1, y1] = b;
  const dx = Math.abs(x1 - x0);
  const dy = -Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;
  for (;;) {
    cells.push([x0, y0]);
    if (x0 === x1 && y0 === y1) break;
    const e2 = 2 * err;
    if (e2 >= dy) {
      err += dy;
      x0 += sx;
    }
    if (e2 <= dx) {
      err += dx;
      y0 += sy;
    }
  }
  return cells;
}

// --- the grid you draw on --------------------------------------------------------------------

function Canvas({
  art,
  scheme,
  mirror,
  cursor,
  onStroke,
}: {
  art: string[];
  scheme: SchemeName;
  mirror: boolean;
  cursor: [number, number] | null;
  onStroke: (cells: [number, number][], start: boolean) => void;
}) {
  const holder = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const [size, setSize] = useState(256);
  const last = useRef<[number, number] | null>(null);

  useEffect(() => {
    const el = holder.current;
    if (!el) return;
    const fit = () => setSize(Math.max(64, Math.floor(Math.min(el.clientWidth, el.clientHeight) / FACE_SIZE) * FACE_SIZE));
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const c = canvas.current;
    const ctx = c?.getContext("2d");
    if (!c || !ctx) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    c.width = size * dpr;
    c.height = size * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const colors = CRT_COLORS[scheme];
    const accent = guestFace(art, scheme).accent ?? colors.fg;
    const cell = size / FACE_SIZE;
    const inset = Math.max(1, Math.round(cell / 14));

    ctx.fillStyle = colors.bg;
    ctx.fillRect(0, 0, size, size);

    // A dot in every empty cell, so you can see the grid you are drawing on.
    ctx.fillStyle = `${colors.fg}33`;
    for (let y = 0; y < FACE_SIZE; y++) {
      for (let x = 0; x < FACE_SIZE; x++) {
        ctx.fillRect(x * cell + cell / 2 - 1, y * cell + cell / 2 - 1, 2, 2);
      }
    }

    if (mirror) {
      ctx.fillStyle = `${colors.fg}26`;
      ctx.fillRect(size / 2 - 1, 0, 2, size);
    }

    art.forEach((row, y) => {
      row.split("").forEach((char, x) => {
        if (char === ".") return;
        const color = char === "@" ? accent : colors.fg;
        ctx.fillStyle = color;
        ctx.shadowColor = color;
        ctx.shadowBlur = cell * 0.5;
        ctx.fillRect(x * cell + inset, y * cell + inset, cell - inset * 2, cell - inset * 2);
      });
    });
    ctx.shadowBlur = 0;

    if (cursor) {
      ctx.strokeStyle = colors.fg;
      ctx.lineWidth = 2;
      ctx.strokeRect(cursor[0] * cell + 1, cursor[1] * cell + 1, cell - 2, cell - 2);
    }
  }, [art, scheme, mirror, cursor, size]);

  const cellAt = (e: React.PointerEvent): [number, number] => {
    const rect = canvas.current!.getBoundingClientRect();
    const x = Math.floor(((e.clientX - rect.left) / rect.width) * FACE_SIZE);
    const y = Math.floor(((e.clientY - rect.top) / rect.height) * FACE_SIZE);
    return [Math.min(FACE_SIZE - 1, Math.max(0, x)), Math.min(FACE_SIZE - 1, Math.max(0, y))];
  };

  return (
    <div ref={holder} className="w-full h-full flex items-center justify-center">
      <canvas
        ref={canvas}
        style={{ width: size, height: size, touchAction: "none" }}
        className="border-[0.4cqh] border-[var(--fg)] shadow-[0_0_1.5cqh_var(--glow)] cursor-crosshair"
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          const at = cellAt(e);
          last.current = at;
          onStroke([at], true);
        }}
        onPointerMove={(e) => {
          if (!last.current) return;
          const at = cellAt(e);
          if (at[0] === last.current[0] && at[1] === last.current[1]) return;
          onStroke(cellsBetween(last.current, at).slice(1), false);
          last.current = at;
        }}
        onPointerUp={() => (last.current = null)}
        onPointerCancel={() => (last.current = null)}
      />
    </div>
  );
}

// --- the app ---------------------------------------------------------------------------------

export default function Faces({ onExit, tall = false }: { onExit: () => void; tall?: boolean }) {
  const [view, setView] = useState<View>("draw");
  const [draft, setDraft] = useState<Draft>(loadDraft);
  const [tool, setTool] = useState<Tool>("#");
  const [mirror, setMirror] = useState(true);
  const [cursor, setCursor] = useState<[number, number] | null>(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [gallery, setGallery] = useState<GuestFace[] | null | undefined>(undefined);
  const [page, setPage] = useState(0);
  const [picked, setPicked] = useState(0);
  // What the current stroke paints. Starting on a cell that already has the tool's colour erases.
  const strokeValue = useRef<Tool>("#");

  const { art, scheme, author, message } = draft;
  const lit = litCount(art);

  useEffect(() => {
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    } catch {
      // Lost on reload, nothing worse.
    }
  }, [draft]);

  useEffect(() => {
    if (view === "gallery" && gallery === undefined) fetchFaces().then(setGallery);
  }, [view, gallery]);

  const artRef = useRef(art);
  artRef.current = art;

  const stroke = useCallback(
    (cells: [number, number][], start: boolean) => {
      if (start) {
        const [x, y] = cells[0];
        strokeValue.current = tool !== "." && artRef.current[y][x] === tool ? "." : tool;
        blip(strokeValue.current === "." ? 440 : 880);
      }
      const value = strokeValue.current;
      setDraft((d) => {
        let next = d.art;
        cells.forEach(([x, y]) => (next = setCell(next, x, y, value, mirror)));
        return { ...d, art: next };
      });
    },
    [tool, mirror],
  );

  const send = useCallback(async () => {
    const name = cleanText(author, AUTHOR_MAX, true);
    const note = cleanText(message, MESSAGE_MAX, false);
    if (name === null) return setError(ERRORS.author);
    if (note === null) return setError(ERRORS.message);
    if (!cleanArt(art)) return setError(ERRORS.art);

    setSending(true);
    setError(null);
    const result = await sendFace({ art, scheme, author: name, message: note });
    setSending(false);

    if (!result.ok) {
      setError(ERRORS[result.error] ?? "SOMETHING WENT WRONG. TRY AGAIN.");
      return;
    }
    rememberMyFace({ id: result.id, art, scheme, author: name, message: note, at: Date.now() });
    playNotes([[523, 0, 0.08], [784, 0.08, 0.08], [1047, 0.16, 0.2]], 0.07);
    setView("sent");
  }, [art, scheme, author, message]);

  const perPage = tall ? GALLERY_PAGE.tall : GALLERY_PAGE.wide;
  const pages = gallery ? Math.max(1, Math.ceil(gallery.length / perPage)) : 1;

  // Keyboard: arrows and space draw on the grid, Esc steps back.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = (e.target as HTMLElement | null)?.tagName === "INPUT";
      if (e.key === "Escape") {
        e.preventDefault();
        if (view === "sign") setView("draw");
        else onExit();
        return;
      }
      if (typing) return;

      if (view === "draw") {
        const moves: Record<string, [number, number]> = {
          ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0],
        };
        if (moves[e.key]) {
          e.preventDefault();
          setCursor((c) => {
            const [x, y] = c ?? [7, 7];
            const [dx, dy] = moves[e.key];
            return [Math.min(15, Math.max(0, x + dx)), Math.min(15, Math.max(0, y + dy))];
          });
        } else if (e.key === " " && cursor) {
          e.preventDefault();
          stroke([cursor], true);
        } else if (e.key === "Enter" && lit >= MIN_LIT) {
          e.preventDefault();
          setView("sign");
        }
      } else if (view === "gallery" && gallery?.length) {
        if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
          e.preventDefault();
          const step = e.key === "ArrowRight" ? 1 : -1;
          const next = Math.min(gallery.length - 1, Math.max(0, picked + step));
          setPicked(next);
          setPage(Math.floor(next / perPage));
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [view, cursor, stroke, lit, onExit, gallery, picked, perPage]);

  const button = "px-[1.6cqh] py-[0.4cqh] border-[0.4cqh] border-[var(--fg)] hover:bg-[var(--dim)] disabled:opacity-40";
  const tab = (id: View, label: string) => (
    <button
      onClick={() => setView(id === "draw" && view === "sign" ? "sign" : id)}
      className={`px-[1.5cqh] ${
        (id === "draw" ? view !== "gallery" : view === id) ? "bg-[var(--bg)] text-[var(--fg)]" : ""
      }`}
    >
      {label}
    </button>
  );

  const preview = guestFace(art, scheme);

  return (
    <div className="absolute inset-0 flex flex-col">
      <div className={`flex justify-between items-center px-[3cqh] py-[0.5cqh] ${INVERSE}`}>
        <span>FACES.EXE</span>
        <span className="flex gap-[0.5cqh]">
          {tab("draw", "DRAW")}
          {tab("gallery", "GALLERY")}
        </span>
      </div>

      {view === "draw" && (
        <div className={`flex-1 min-h-0 flex ${tall ? "flex-col" : ""} gap-[3cqh] p-[3cqh]`}>
          <div className="flex-1 min-h-0 min-w-0">
            <Canvas art={art} scheme={scheme} mirror={mirror} cursor={cursor} onStroke={stroke} />
          </div>

          <div className={`flex ${tall ? "flex-row flex-wrap justify-center" : "flex-col w-[34%]"} gap-[2cqh] text-[0.8em]`}>
            <div className={`flex ${tall ? "" : "flex-col"} gap-[1cqh]`}>
              {TOOLS.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTool(t.id)}
                  className={`${button} text-left flex items-center gap-[1cqh] ${tool === t.id ? INVERSE : ""}`}
                >
                  <span
                    className="inline-block w-[2.4cqh] h-[2.4cqh] border-[0.3cqh] border-current"
                    style={{
                      background: t.id === "#" ? CRT_COLORS[scheme].fg : t.id === "@" ? preview.accent : "transparent",
                    }}
                  />
                  {t.label}
                </button>
              ))}
            </div>

            <button onClick={() => setMirror((m) => !m)} className={`${button} text-left`}>
              MIRROR {mirror ? "ON" : "OFF"}
            </button>

            <div className="flex gap-[1cqh] items-center">
              {SCHEMES.map((s) => (
                <button
                  key={s}
                  onClick={() => setDraft((d) => ({ ...d, scheme: s }))}
                  aria-label={`${s} phosphor`}
                  className={`w-[4.5cqh] h-[4.5cqh] border-[0.4cqh] ${
                    scheme === s ? "border-[var(--fg)] outline outline-[0.3cqh] outline-offset-[0.3cqh] outline-[var(--fg)]" : "border-transparent"
                  }`}
                  style={{ background: CRT_COLORS[s].fg, boxShadow: `0 0 1cqh ${CRT_COLORS[s].glow}` }}
                />
              ))}
            </div>

            <button onClick={() => setDraft((d) => ({ ...d, art: emptyArt() }))} className={`${button} text-left`}>
              CLEAR
            </button>

            <button
              onClick={() => setView("sign")}
              disabled={lit < MIN_LIT}
              className={`${tall ? "" : "mt-auto"} px-[1.6cqh] py-[0.6cqh] ${INVERSE} disabled:opacity-40`}
            >
              SIGN IT &gt;
            </button>
          </div>
        </div>
      )}

      {view === "sign" && (
        <div className={`flex-1 min-h-0 flex ${tall ? "flex-col items-center" : "items-center"} gap-[4cqh] px-[5cqh] py-[3cqh]`}>
          <div className="flex flex-col items-center gap-[1.5cqh] shrink-0">
            <div className="border-[0.5cqh] border-[var(--fg)] p-[1cqh] shadow-[0_0_1.5cqh_var(--glow)]">
              <FaceIcon art={art} color={preview.color} accent={preview.accent} className={tall ? "w-[22cqh] h-[22cqh]" : "w-[34cqh] h-[34cqh]"} />
            </div>
          </div>

          <form
            className="flex-1 w-full min-w-0 flex flex-col gap-[2.2cqh]"
            onSubmit={(e) => {
              e.preventDefault();
              void send();
            }}
          >
            <label className="flex flex-col gap-[0.5cqh]">
              <span className="text-[0.75em] opacity-80">YOUR NAME</span>
              <input
                autoFocus
                value={author}
                maxLength={AUTHOR_MAX}
                onChange={(e) => setDraft((d) => ({ ...d, author: e.target.value }))}
                className="bg-transparent border-b-[0.4cqh] border-[var(--fg)] outline-none caret-[var(--fg)] py-[0.3cqh] placeholder:text-[var(--dim)]"
                placeholder="who drew this"
              />
            </label>
            <label className="flex flex-col gap-[0.5cqh]">
              <span className="text-[0.75em] opacity-80 flex justify-between">
                <span>A NOTE FOR FERNANDO</span>
                <span className="tabular-nums">{[...message].length}/{MESSAGE_MAX}</span>
              </span>
              <input
                value={message}
                maxLength={MESSAGE_MAX}
                onChange={(e) => setDraft((d) => ({ ...d, message: e.target.value }))}
                className="bg-transparent border-b-[0.4cqh] border-[var(--fg)] outline-none caret-[var(--fg)] py-[0.3cqh] placeholder:text-[var(--dim)]"
                placeholder="optional"
              />
            </label>
            <p className="text-[0.7em] opacity-70 leading-[1.5]">
              Your face goes on your PC right away. Everyone else sees it once Fernando approves it.
            </p>
            {error && <p className="text-[0.75em]">{error}</p>}
            <div className="flex gap-[2cqh]">
              <button type="button" onClick={() => setView("draw")} className={button}>
                &lt; BACK
              </button>
              <button type="submit" disabled={sending} className={`px-[1.6cqh] ${INVERSE} disabled:opacity-60`}>
                {sending ? "SENDING..." : "SEND"}
              </button>
            </div>
          </form>
        </div>
      )}

      {view === "sent" && (
        <div className="flex-1 flex flex-col items-center justify-center gap-[2.5cqh] text-center px-[5cqh]">
          <div className="border-[0.5cqh] border-[var(--fg)] p-[1cqh] shadow-[0_0_1.5cqh_var(--glow)]">
            <FaceIcon art={art} color={preview.color} accent={preview.accent} className="w-[26cqh] h-[26cqh]" />
          </div>
          <div className="text-[1.4em]">SENT!</div>
          <p className="text-[0.8em] opacity-80 max-w-[44ch] leading-[1.5]">
            It's on your PC now. Close harogatOS and wait a few seconds. Everyone else gets it once Fernando
            says yes.
          </p>
          <div className="flex gap-[2cqh]">
            <button
              onClick={() => {
                setDraft((d) => ({ ...d, art: emptyArt() }));
                setView("draw");
              }}
              className={button}
            >
              DRAW ANOTHER
            </button>
            <button onClick={onExit} className={`px-[1.6cqh] ${INVERSE}`}>
              DESKTOP
            </button>
          </div>
        </div>
      )}

      {view === "gallery" && (
        <div className="flex-1 min-h-0 flex flex-col p-[3cqh] gap-[2cqh]">
          {gallery === undefined ? (
            <div className="m-auto crt-led">LOADING...</div>
          ) : gallery === null ? (
            <div className="m-auto text-center leading-[1.6]">
              <div>NO SIGNAL</div>
              <div className="text-[0.75em] opacity-80">the gallery lives on fharo.dev</div>
            </div>
          ) : gallery.length === 0 ? (
            <div className="m-auto text-center leading-[1.6]">
              <div>NO FACES YET</div>
              <div className="text-[0.75em] opacity-80">draw the first one</div>
            </div>
          ) : (
            <>
              <div className={`flex-1 min-h-0 grid ${tall ? "grid-cols-3" : "grid-cols-5"} gap-[2cqh] content-start`}>
                {gallery.slice(page * perPage, (page + 1) * perPage).map((face, i) => {
                  const index = page * perPage + i;
                  const data = guestFace(face.art, face.scheme);
                  return (
                    <button
                      key={face.id}
                      onClick={() => setPicked(index)}
                      onMouseEnter={() => setPicked(index)}
                      className={`flex flex-col items-center gap-[0.6cqh] p-[0.8cqh] ${index === picked ? "outline outline-[0.4cqh] outline-[var(--fg)]" : ""}`}
                    >
                      <FaceIcon art={face.art} color={data.color} accent={data.accent} className="w-full aspect-square max-w-[16cqh]" />
                      <span className="text-[0.65em] truncate max-w-full">{face.author}</span>
                    </button>
                  );
                })}
              </div>
              <div className="border-t-[0.4cqh] border-[var(--dim)] pt-[1.2cqh] flex items-center gap-[2cqh] text-[0.8em] min-h-[7cqh]">
                <div className="flex-1 min-w-0 leading-[1.4]">
                  {gallery[picked] && (
                    <>
                      <span className="opacity-70">{gallery[picked].author}: </span>
                      {gallery[picked].message ? `"${gallery[picked].message}"` : "(no note)"}
                    </>
                  )}
                </div>
                {pages > 1 && (
                  <div className="flex gap-[1cqh] items-center shrink-0 tabular-nums">
                    <button className={button} disabled={page === 0} onClick={() => setPage((p) => p - 1)} aria-label="Previous page">
                      &lt;
                    </button>
                    {page + 1}/{pages}
                    <button className={button} disabled={page >= pages - 1} onClick={() => setPage((p) => p + 1)} aria-label="Next page">
                      &gt;
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
