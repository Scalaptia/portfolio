import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { navigate } from "astro:transitions/client";

// The projects as 3.5" floppies. Drag one into the PC, or click it, and the PC takes the disk,
// reads it, and the page changes to that project with the CRT transition.
//
// The disks are SVG on the page, not 3D. The only thing that has to agree with the model is where
// its drive slot is on screen, which is SLOT below, as a fraction of the PC's box with it facing
// front. The PC faces front while it reads (see the 'reading' mode in PCModelCanvas).

interface Disk {
  title: string;
  slug?: string;
}

interface FloppyDrawerProps {
  projects: Disk[];
  locale: string;
  hint: string;
  loadLabel: string;
}

// The drive slot on the model's front, as a fraction of #pc-model-container.
const SLOT = { x: 0.585, y: 0.63 };
const DISK_W = 112;
const DISK_H = 116;
const FLY_MS = 620;
const SWALLOW_MS = 200;
const READ_MS = 1250;
const OK_MS = 420;
// How far a press has to move before it counts as a drag rather than a click.
const DRAG_START_PX = 6;

// Body, label stripe, and the colour the title is written in.
const COLORS = [
  { body: "#FD8D75", stripe: "#412C47", ink: "#412C47" },
  { body: "#ADC7C6", stripe: "#FD8D75", ink: "#412C47" },
  { body: "#412C47", stripe: "#ADC7C6", ink: "#412C47" },
  { body: "#F2C14E", stripe: "#412C47", ink: "#412C47" },
];
const TILTS = [-4, 3, -2, 4];

const emit = (name: string, detail: unknown) => window.dispatchEvent(new CustomEvent(name, { detail }));
const dock = (docked: boolean) => emit("pcDock", { docked });
const calm = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function pcRect(): DOMRect | null {
  return document.getElementById("pc-model-container")?.getBoundingClientRect() ?? null;
}

function slotPoint(): { x: number; y: number } | null {
  const rect = pcRect();
  if (!rect) return null;
  return { x: rect.left + rect.width * SLOT.x, y: rect.top + rect.height * SLOT.y };
}

function overPC(x: number, y: number): boolean {
  const rect = pcRect();
  if (!rect) return false;
  const pad = 28;
  return x > rect.left - pad && x < rect.right + pad && y > rect.top - pad && y < rect.bottom + pad;
}

function FloppySvg({ title, index, className = "block" }: { title: string; index: number; className?: string }) {
  const c = COLORS[index % COLORS.length];
  return (
    <svg viewBox="0 0 112 116" width={DISK_W} height={DISK_H} aria-hidden="true" className={className}>
      {/* Body, with the chamfered corner every 3.5" disk has */}
      <path d="M3 3 H97 L109 15 V113 H3 Z" fill={c.body} stroke="#412C47" strokeWidth="3" strokeLinejoin="round" />
      {/* Metal shutter and the window onto the magnetic disk */}
      <rect x="28" y="3" width="54" height="38" fill="#D9DCE1" stroke="#412C47" strokeWidth="3" />
      <rect x="60" y="10" width="13" height="24" fill="#412C47" />
      <rect x="34" y="3" width="4" height="38" fill="#ffffff" opacity="0.6" />
      {/* Write-protect notch */}
      <rect x="9" y="99" width="9" height="9" fill="#412C47" />
      {/* Label */}
      <rect x="15" y="52" width="82" height="55" fill="#FDF7E7" stroke="#412C47" strokeWidth="2.5" />
      <rect x="15" y="52" width="82" height="9" fill={c.stripe} />
      <line x1="21" y1="94" x2="91" y2="94" stroke="#412C47" strokeOpacity="0.18" strokeWidth="1.5" />
      <line x1="21" y1="101" x2="91" y2="101" stroke="#412C47" strokeOpacity="0.18" strokeWidth="1.5" />
      <text
        x="56"
        y="83"
        textAnchor="middle"
        fill={c.ink}
        fontFamily="'Archivo Black', sans-serif"
        fontSize={13}
        // Long titles are squeezed to fit the label rather than run off it.
        {...(title.length > 8 ? { textLength: 70, lengthAdjust: "spacingAndGlyphs" } : {})}
        transform="rotate(-3 56 80)"
      >
        {title}
      </text>
    </svg>
  );
}

interface Flight {
  index: number;
  from: { x: number; y: number; tilt: number };
}

export default function FloppyDrawer({ projects, locale, hint, loadLabel }: FloppyDrawerProps) {
  const [drag, setDrag] = useState<{ index: number; x: number; y: number; dx: number; dy: number; tilt: number } | null>(null);
  const [hovering, setHovering] = useState(false);
  const [flight, setFlight] = useState<Flight | null>(null);
  const [busy, setBusy] = useState(false);
  // The disk that went into the drive stays out of the box until the page changes.
  const [inserted, setInserted] = useState<number | null>(null);
  const press = useRef<{ index: number; x: number; y: number; dx: number; dy: number; dragging: boolean } | null>(null);
  const ghost = useRef<HTMLDivElement>(null);
  const lastX = useRef(0);

  const hrefFor = (disk: Disk) => (disk.slug ? `${locale === "es" ? "/es" : ""}/projects/${disk.slug}` : null);

  // The PC reads the disk, says OK, and the page goes to the project.
  const read = useCallback(
    (index: number) => {
      emit("pcFloppy", { phase: "reading" });
      setTimeout(() => emit("pcFloppy", { phase: "done" }), calm() ? 300 : READ_MS);
      setTimeout(() => {
        const href = hrefFor(projects[index]);
        if (href) navigate(href);
        else {
          emit("pcFloppy", { phase: "idle" });
          dock(false);
          setBusy(false);
          setInserted(null);
        }
      }, calm() ? 500 : READ_MS + OK_MS);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [projects, locale],
  );

  const insert = useCallback(
    (index: number, from: { x: number; y: number }, tilt: number, wasDocked: boolean) => {
      setBusy(true);
      setInserted(index);
      emit("pcFloppy", { phase: "incoming" });
      if (calm()) {
        read(index);
        return;
      }
      // A docking PC slides into its corner first. Give it a moment so the slot is where it ends up.
      setTimeout(() => setFlight({ index, from: { ...from, tilt } }), wasDocked ? 0 : 380);
    },
    [read],
  );

  // Fly the disk into the slot with the Web Animations API, then swallow it.
  useEffect(() => {
    if (!flight || !ghost.current) return;
    const slot = slotPoint();
    if (!slot) {
      read(flight.index);
      return;
    }
    const el = ghost.current;
    const { from } = flight;
    // Small enough to pass for a disk going into a drive this size.
    const rect = pcRect();
    const scale = rect ? Math.max(0.16, (rect.width * 0.21) / DISK_W) : 0.25;
    const lift = Math.min(160, Math.abs(slot.x - from.x) * 0.25 + 60);
    const midX = (from.x + slot.x) / 2;
    const midY = Math.min(from.y, slot.y) - lift;

    const at = (x: number, y: number) => `translate(${x - DISK_W / 2}px, ${y - DISK_H / 2}px)`;
    const flying = el.animate(
      [
        { transform: `${at(from.x, from.y)} rotate(${from.tilt}deg) scale(1)` },
        { transform: `${at(midX, midY)} rotate(${from.tilt + 90}deg) scale(${(1 + scale) / 1.6})`, offset: 0.5 },
        { transform: `${at(slot.x, slot.y)} rotate(180deg) scale(${scale})` },
      ],
      { duration: FLY_MS, easing: "cubic-bezier(0.45, 0, 0.25, 1)", fill: "forwards" },
    );

    let swallow: Animation | undefined;
    flying.onfinish = () => {
      // Shutter end first, into the slot: it shortens and slips down out of sight.
      swallow = el.animate(
        [
          { transform: `${at(slot.x, slot.y)} rotate(180deg) scale(${scale}, ${scale})`, opacity: 1 },
          { transform: `${at(slot.x, slot.y + 4)} rotate(180deg) scale(${scale}, 0.02)`, opacity: 0.2 },
        ],
        { duration: SWALLOW_MS, easing: "ease-in", fill: "forwards" },
      );
      swallow.onfinish = () => {
        setFlight(null);
        read(flight.index);
      };
    };
    return () => {
      flying.cancel();
      swallow?.cancel();
    };
  }, [flight, read]);

  const onPointerDown = (e: React.PointerEvent, index: number) => {
    if (busy || e.button !== 0) return;
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    press.current = {
      index,
      x: e.clientX,
      y: e.clientY,
      dx: e.clientX - (rect.left + rect.width / 2),
      dy: e.clientY - (rect.top + rect.height / 2),
      dragging: false,
    };
    lastX.current = e.clientX;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const p = press.current;
    if (!p) return;
    if (!p.dragging) {
      if (Math.hypot(e.clientX - p.x, e.clientY - p.y) < DRAG_START_PX) return;
      p.dragging = true;
      dock(true);
    }
    // Lean into the direction of travel, like something held by one corner.
    const vx = e.clientX - lastX.current;
    lastX.current = e.clientX;
    const tilt = Math.max(-18, Math.min(18, vx * 1.6));
    setDrag({ index: p.index, x: e.clientX - p.dx, y: e.clientY - p.dy, dx: p.dx, dy: p.dy, tilt });

    const over = overPC(e.clientX, e.clientY);
    if (over !== hovering) {
      setHovering(over);
      emit("pageInteraction", { type: "project", hovered: over });
    }
  };

  const onPointerUp = (e: React.PointerEvent, index: number) => {
    const p = press.current;
    press.current = null;
    if (!p) return;

    if (!p.dragging) {
      // A click. Take it from where it sits on the shelf.
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      const docked = getComputedStyle(document.getElementById("pc-model-container")!).position === "fixed";
      dock(true);
      insert(index, { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }, TILTS[index % TILTS.length], docked);
      return;
    }

    const at = drag;
    setDrag(null);
    if (hovering) emit("pageInteraction", { type: "project", hovered: false });
    setHovering(false);

    if (at && overPC(e.clientX, e.clientY)) {
      insert(index, { x: at.x, y: at.y }, at.tilt, true);
    } else {
      // Missed. The disk drops back onto the shelf and the PC goes home.
      setTimeout(() => dock(false), 250);
    }
  };

  // Escape mid-drag puts the disk back.
  useEffect(() => {
    if (!drag) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      press.current = null;
      setDrag(null);
      setHovering(false);
      dock(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [drag]);

  const flyingIndex = flight?.index ?? null;

  return (
    <div className="w-full mb-10 lg:mb-12 relative z-10">
      <div className="bg-background border-2 sm:border-4 border-text shadow-[4px_4px_0px_0px_rgba(65,44,71,1)] sm:shadow-[8px_8px_0px_0px_rgba(65,44,71,1)]">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-4 sm:px-6 py-2 border-b-2 sm:border-b-4 border-text bg-text text-background font-ubuntu-mono">
          <span className="font-bold">A:\&gt; insert_disk</span>
          <span className="text-xs sm:text-sm text-background/70">{hint}</span>
        </div>

        <ul className="flex flex-wrap justify-center sm:justify-start gap-6 sm:gap-8 px-4 sm:px-8 pt-7 pb-6">
          {projects.map((disk, i) => {
            const lifted = drag?.index === i || flyingIndex === i || inserted === i;
            return (
              <li key={disk.title}>
                <button
                  type="button"
                  disabled={busy && flyingIndex !== i}
                  aria-label={`${loadLabel} ${disk.title}`}
                  onPointerDown={(e) => onPointerDown(e, i)}
                  onPointerMove={onPointerMove}
                  onPointerUp={(e) => onPointerUp(e, i)}
                  onKeyDown={(e) => {
                    if (e.key !== "Enter" && e.key !== " ") return;
                    e.preventDefault();
                    const rect = e.currentTarget.getBoundingClientRect();
                    dock(true);
                    insert(i, { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }, TILTS[i % TILTS.length], false);
                  }}
                  className="group relative block touch-none select-none cursor-grab active:cursor-grabbing outline-none focus-visible:ring-4 focus-visible:ring-primary disabled:cursor-default"
                  style={{ transform: `rotate(${TILTS[i % TILTS.length]}deg)` }}
                >
                  <span
                    className={`block transition-transform duration-200 ease-out group-hover:-translate-y-2 group-hover:rotate-[2deg] ${
                      lifted ? "opacity-0" : ""
                    }`}
                    style={{ filter: "drop-shadow(4px 4px 0 #412C47)" }}
                  >
                    <FloppySvg title={disk.title} index={i} className="block w-[92px] h-auto sm:w-[112px]" />
                  </span>
                  {/* Where it goes back to while it is out of the box */}
                  {lifted && (
                    <span className="absolute inset-0 border-2 border-dashed border-text/30" style={{ clipPath: "polygon(0 0, 87% 0, 100% 10%, 100% 100%, 0 100%)" }} />
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      {(drag || flight) &&
        createPortal(
          <div
            ref={ghost}
            className="fixed left-0 top-0 z-[60] pointer-events-none"
            style={
              drag
                ? {
                    transform: `translate(${drag.x - DISK_W / 2}px, ${drag.y - DISK_H / 2}px) rotate(${drag.tilt}deg) scale(${hovering ? 0.8 : 1.06})`,
                    transition: "transform 90ms linear",
                    filter: "drop-shadow(10px 12px 0 rgba(65,44,71,0.55))",
                  }
                : { filter: "drop-shadow(6px 8px 0 rgba(65,44,71,0.45))" }
            }
          >
            <FloppySvg
              title={projects[(drag?.index ?? flight?.index)!].title}
              index={(drag?.index ?? flight?.index)!}
            />
          </div>,
          document.body,
        )}
    </div>
  );
}
