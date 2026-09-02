import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import PixelIcon from "./PixelIcon";
import { closeViewer, navigateViewer, stepViewer } from "@/lib/crtViewer";
import { useViewerState } from "@/lib/useViewerState";

// The picture opens on a monitor rather than on a black rectangle. Case, bezel, curved glass and a
// chin with real buttons, all in DOM, so it lays out the same on a phone as on a desktop and costs
// nothing on a browser with no WebGL.

const OPEN_MS = 540;
const CLOSE_MS = 260;
// A drag only counts as moving along the set if it went mostly sideways and the picture is not
// zoomed in, since at any other magnification a drag is a pan.
const SWIPE_MIN = 55;
const DOUBLE_TAP_MS = 300;
const MAX_ZOOM = 5;
// The monitor has two shapes and no others: one for pictures of phones, one for everything else.
const TUBE_WIDE = 3 / 2;
// What a double tap jumps to. Enough to read text in a screenshot on a phone.
const TAP_ZOOM = 2.6;

// The same phosphor palette the model's screen uses. Copied rather than imported so the viewer does
// not drag the 12x12 face art into the first page load.
const SCHEMES = {
  green: { bg: "#001100", fg: "#00FF41", glow: "rgba(0, 255, 65, 0.32)" },
  amber: { bg: "#110800", fg: "#FFB000", glow: "rgba(255, 176, 0, 0.32)" },
  blue: { bg: "#000815", fg: "#00D4FF", glow: "rgba(0, 212, 255, 0.32)" },
  pink: { bg: "#150010", fg: "#FF6B9D", glow: "rgba(255, 107, 157, 0.32)" },
  off: { bg: "#050505", fg: "#1a1a1a", glow: "rgba(0, 0, 0, 0)" },
};

// Every button on the site presses the same way. See .press in src/styles/crt.css.
const BUTTON =
  "press [--press:3px] flex items-center justify-center border-2 border-text bg-white text-text";

const clamp = (value: number, low: number, high: number) =>
  Math.min(high, Math.max(low, value));

const tubeFor = (aspect: number) => clamp(aspect, 0.4, 2.6);

interface Zoom {
  scale: number;
  x: number;
  y: number;
}

const RESET: Zoom = { scale: 1, x: 0, y: 0 };

async function chime(kind: "on" | "off") {
  try {
    const sounds = await import("./pc-model/sounds");
    if (kind === "on") sounds.playBootSound();
    else sounds.playPowerDownSound();
  } catch {
    // No audio, no problem.
  }
}

export default function CrtLightbox() {
  const { items, index, scheme, origin } = useViewerState();
  const item = items[index];
  const many = items.length > 1;
  const colors = SCHEMES[scheme] ?? SCHEMES.green;

  const [closing, setClosing] = useState(false);
  const [entered, setEntered] = useState(false);
  // The tube takes the shape of the picture on it, so nothing is letterboxed into dead phosphor.
  const [aspect, setAspect] = useState(TUBE_WIDE);
  const [zoom, setZoom] = useState<Zoom>(RESET);
  const [smooth, setSmooth] = useState(true);

  // The glass is shaped once, by whatever opens first, and then it is a physical object for as
  // long as it is on screen. A monitor that changed shape under you every time you pressed next
  // was the wrong idea however accurate it was.
  const shaped = useRef(false);

  const rootRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const glassRef = useRef<HTMLDivElement>(null);

  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<{ gap: number; scale: number } | null>(null);
  const drag = useRef<{ x: number; y: number; zx: number; zy: number } | null>(null);
  const gesture = useRef<{ x: number; y: number; at: number; moved: boolean } | null>(null);
  const lastTap = useRef(0);

  // Anyone who asked for less motion gets the same monitor with not one animation on it.
  const calm = useMemo(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    [],
  );

  const requestClose = useCallback(() => {
    if (closing) return;
    setClosing(true);
    chime("off");
    if (calm) {
      closeViewer();
      return;
    }
    setTimeout(closeViewer, CLOSE_MS);
  }, [closing, calm]);

  // Opening warms the tube up. After that a new picture is a channel change, not another boot.
  useEffect(() => {
    chime("on");
    const t = setTimeout(() => setEntered(true), calm ? 0 : OPEN_MS);
    return () => clearTimeout(t);
  }, [calm]);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  // A new picture starts at its own size, not at whatever magnification the last one was left at.
  useEffect(() => {
    setSmooth(false);
    setZoom(RESET);
    if (!shaped.current && items[index]?.type === "youtube") {
      setAspect(TUBE_WIDE);
      shaped.current = true;
    }
  }, [index, items]);

  // Keys, and a Tab that cannot get out of the monitor.
  useEffect(() => {
    closeRef.current?.focus({ preventScroll: true });

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        requestClose();
        return;
      }
      if (e.key === "ArrowLeft" && many) {
        e.preventDefault();
        stepViewer(-1);
        return;
      }
      if (e.key === "ArrowRight" && many) {
        e.preventDefault();
        stepViewer(1);
        return;
      }
      if (e.key !== "Tab") return;

      const focusable = rootRef.current?.querySelectorAll<HTMLElement>(
        "button:not([disabled])",
      );
      if (!focusable?.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [requestClose, many]);

  // Every picture in the set is fetched the moment the viewer opens, not just the two either side.
  // The picture no longer fades in, so a frame where it has not decoded yet would be a flash of
  // bare glass. A set is a handful of files and most of them are already in the page.
  useEffect(() => {
    items.forEach((item) => {
      if (item.type !== "image") return;
      const img = new Image();
      img.src = item.lightboxSrc || item.src;
    });
  }, [items]);

  // ZOOM AND PAN
  // Past 1x the picture is bigger than the glass, so a drag has somewhere to go. Panning is capped
  // at that overflow, which is why the edges never come away from the frame.
  const limit = useCallback((scale: number) => {
    const box = glassRef.current?.getBoundingClientRect();
    if (!box) return { x: 0, y: 0 };
    return {
      x: (box.width * (scale - 1)) / 2,
      y: (box.height * (scale - 1)) / 2,
    };
  }, []);

  const settle = useCallback(
    (next: Zoom): Zoom => {
      const scale = clamp(next.scale, 1, MAX_ZOOM);
      const max = limit(scale);
      return {
        scale,
        x: clamp(next.x, -max.x, max.x),
        y: clamp(next.y, -max.y, max.y),
      };
    },
    [limit],
  );

  const zoomAt = useCallback(
    (scale: number, clientX?: number, clientY?: number, ease = true) => {
      const box = glassRef.current?.getBoundingClientRect();
      setSmooth(ease);
      setZoom((current) => {
        const target = clamp(scale, 1, MAX_ZOOM);
        if (target === 1 || !box || clientX === undefined || clientY === undefined) {
          return settle({ scale: target, x: 0, y: 0 });
        }
        // Keep whatever is under the finger under the finger.
        const offsetX = clientX - (box.left + box.width / 2);
        const offsetY = clientY - (box.top + box.height / 2);
        const ratio = target / current.scale;
        return settle({
          scale: target,
          x: current.x - (offsetX - current.x) * (ratio - 1),
          y: current.y - (offsetY - current.y) * (ratio - 1),
        });
      });
    },
    [settle],
  );

  const shape = useCallback((raw: number) => {
    if (shaped.current) return;
    shaped.current = true;
    setAspect(tubeFor(raw));
  }, []);

  const gapBetween = () => {
    const [a, b] = [...pointers.current.values()];
    return Math.hypot(a.x - b.x, a.y - b.y);
  };

  const onPointerDown = (e: React.PointerEvent) => {
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pointers.current.size === 2) {
      pinch.current = { gap: gapBetween(), scale: zoom.scale };
      drag.current = null;
      gesture.current = null;
      return;
    }

    gesture.current = { x: e.clientX, y: e.clientY, at: Date.now(), moved: false };
    if (zoom.scale > 1) {
      setSmooth(false);
      drag.current = { x: e.clientX, y: e.clientY, zx: zoom.x, zy: zoom.y };
    }
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (gesture.current) {
      const travelled =
        Math.abs(e.clientX - gesture.current.x) + Math.abs(e.clientY - gesture.current.y);
      if (travelled > 8) gesture.current.moved = true;
    }

    if (pointers.current.size === 2 && pinch.current) {
      const gap = gapBetween();
      if (!pinch.current.gap) return;
      const [a, b] = [...pointers.current.values()];
      zoomAt(
        (pinch.current.scale * gap) / pinch.current.gap,
        (a.x + b.x) / 2,
        (a.y + b.y) / 2,
        false,
      );
      return;
    }

    if (drag.current) {
      const from = drag.current;
      setZoom((current) =>
        settle({
          scale: current.scale,
          x: from.zx + (e.clientX - from.x),
          y: from.zy + (e.clientY - from.y),
        }),
      );
    }
  };

  const onPointerUp = (e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) pinch.current = null;

    const held = gesture.current;
    gesture.current = null;
    drag.current = null;
    if (!held) return;

    const dx = e.clientX - held.x;
    const dy = e.clientY - held.y;

    // A tap, and a second one within a moment of the first, switches magnification.
    if (!held.moved && Date.now() - held.at < 400) {
      const now = Date.now();
      if (now - lastTap.current < DOUBLE_TAP_MS) {
        lastTap.current = 0;
        zoomAt(zoom.scale > 1 ? 1 : TAP_ZOOM, e.clientX, e.clientY);
      } else {
        lastTap.current = now;
      }
      return;
    }

    // At 1x there is nothing to pan, so a sideways drag moves along the set instead.
    if (zoom.scale === 1 && many && Math.abs(dx) > SWIPE_MIN && Math.abs(dx) > Math.abs(dy)) {
      stepViewer(dx < 0 ? 1 : -1);
    }
  };

  const onWheel = (e: React.WheelEvent) => {
    if (item?.type === "video") return;
    zoomAt(zoom.scale * (e.deltaY < 0 ? 1.18 : 1 / 1.18), e.clientX, e.clientY);
  };

  if (!item) return null;

  // Grow out of the thumbnail that was clicked, and shrink back into it.
  const dx = origin ? origin.x - window.innerWidth / 2 : 0;
  const dy = origin ? origin.y - window.innerHeight / 2 : 0;

  const caseStyle = {
    "--crt-ox": `${dx}px`,
    "--crt-oy": `${dy}px`,
    animation: calm
      ? undefined
      : closing
        ? `crt-case-out ${CLOSE_MS}ms cubic-bezier(0.4, 0, 1, 1) both`
        : `crt-case-in ${OPEN_MS}ms cubic-bezier(0.22, 0.9, 0.24, 1) both`,
  } as React.CSSProperties;

  const screenAnimation = calm
    ? undefined
    : closing
      ? `crt-power-off ${CLOSE_MS}ms ease-in both`
      : entered
        ? "crt-change 340ms cubic-bezier(0.22, 0.9, 0.24, 1) both"
        : `crt-power-on ${OPEN_MS}ms cubic-bezier(0.22, 0.9, 0.24, 1) both`;

  const zoomed = zoom.scale > 1.01;
  const embedded = item.type === "youtube";

  return createPortal(
    <div
      ref={rootRef}
      role="dialog"
      aria-modal="true"
      aria-label="Picture viewer"
      className="fixed inset-0 z-50 flex items-center justify-center px-2 py-3 sm:px-6 sm:py-8"
      onClick={requestClose}
    >
      {/* A dark room, with the monitor the only thing lit in it. */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at 50% 44%, rgba(26, 17, 32, 0.985) 0%, rgba(6, 4, 9, 0.998) 66%)",
          animation: calm ? undefined : `crt-backdrop-in ${OPEN_MS}ms ease both`,
          opacity: closing ? 0 : 1,
          transition: calm ? undefined : `opacity ${CLOSE_MS}ms ease`,
        }}
      />

      {/* A photograph says nothing out loud. */}
      <div className="sr-only" aria-live="polite">
        {`Image ${index + 1} of ${items.length}. ${item.description || item.alt || ""}`}
      </div>

      <div className="relative z-10 flex flex-col items-center gap-3 sm:gap-4 max-w-full">
        {/* The machine */}
        <div
          style={caseStyle}
          onClick={(e) => e.stopPropagation()}
          className="bg-background border-4 border-text shadow-[8px_8px_0px_0px_rgba(253,141,117,0.85)]"
        >
          {/* Case front, holding the bezel */}
          <div className="p-2 sm:p-4">
            <div className="bg-text p-1 sm:p-2.5" style={{ borderRadius: "32px / 40px" }}>
              <div
                ref={glassRef}
                className="crt-screen crt-glass"
                style={
                  {
                    background: colors.bg,
                    "--crt-glow": colors.glow,
                    "--crt-aspect": String(aspect),
                    touchAction: "none",
                    cursor: embedded ? "default" : zoomed ? "grab" : "zoom-in",
                  } as React.CSSProperties
                }
                onPointerDown={embedded ? undefined : onPointerDown}
                onPointerMove={embedded ? undefined : onPointerMove}
                onPointerUp={embedded ? undefined : onPointerUp}
                onPointerCancel={embedded ? undefined : onPointerUp}
                onWheel={embedded ? undefined : onWheel}
              >
                <div
                  key={index}
                  className="absolute inset-0"
                  style={{ animation: screenAnimation }}
                >
                  <div
                    className="w-full h-full flex items-center justify-center"
                    style={{
                      transform: `translate(${zoom.x}px, ${zoom.y}px) scale(${zoom.scale})`,
                      transition:
                        smooth && !calm
                          ? "transform 220ms cubic-bezier(0.2, 0.8, 0.3, 1)"
                          : undefined,
                    }}
                  >
                    {item.type === "youtube" ? (
                      <iframe
                        className="w-full h-full"
                        src={`https://www.youtube-nocookie.com/embed/${item.src}?rel=0&modestbranding=1`}
                        title={item.alt || item.caption || "Video"}
                        allow="accelerometer; clipboard-write; encrypted-media; picture-in-picture; fullscreen"
                        allowFullScreen
                        frameBorder="0"
                      />
                    ) : item.type === "image" ? (
                      <img
                        src={item.lightboxSrc || item.src}
                        alt={item.alt || item.description || "Picture"}
                        className="w-full h-full object-contain select-none"
                        draggable="false"
                        onLoad={(e) => {
                          const img = e.currentTarget;
                          if (img.naturalHeight) shape(img.naturalWidth / img.naturalHeight);
                        }}
                      />
                    ) : (
                      <video
                        controls
                        autoPlay
                        className="w-full h-full object-contain"
                        src={item.lightboxSrc || item.src}
                        onLoadedMetadata={(e) => {
                          const video = e.currentTarget;
                          if (video.videoHeight) shape(video.videoWidth / video.videoHeight);
                        }}
                      />
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Chin */}
          <div className="flex items-center gap-1.5 sm:gap-2 px-2 pb-2 sm:px-4 sm:pb-4">
            {many && (
              <>
                <button
                  onClick={() => stepViewer(-1)}
                  className={`${BUTTON} w-11 h-11 sm:w-10 sm:h-10`}
                  aria-label="Previous"
                >
                  <PixelIcon name="arrow-left" className="w-5 h-5" />
                </button>
                <button
                  onClick={() => stepViewer(1)}
                  className={`${BUTTON} w-11 h-11 sm:w-10 sm:h-10`}
                  aria-label="Next"
                >
                  <PixelIcon name="arrow-right" className="w-5 h-5" />
                </button>
              </>
            )}

            <div className="flex-1" />

            {item.type === "image" && !embedded && (
              <button
                onClick={() => zoomAt(zoomed ? 1 : TAP_ZOOM)}
                className={`${BUTTON} w-11 h-11 sm:w-10 sm:h-10 ${zoomed ? "bg-text text-white hover:bg-text" : ""}`}
                aria-label={zoomed ? "Fit to screen" : "Zoom in"}
                aria-pressed={zoomed}
              >
                <PixelIcon name="maximize" className="w-5 h-5" />
              </button>
            )}

            <button
              ref={closeRef}
              onClick={requestClose}
              className={`${BUTTON} w-11 h-11 sm:w-10 sm:h-10`}
              aria-label="Close"
              title="Close"
            >
              <PixelIcon name="power" className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* What you are looking at, printed under the machine */}
        {(item.caption || item.description) && (
          <div
            className="text-center max-w-[min(90vw,640px)] px-2"
            style={{ opacity: closing ? 0 : 1, transition: `opacity ${CLOSE_MS}ms ease` }}
            onClick={(e) => e.stopPropagation()}
          >
            {item.caption && (
              <span className="text-white/40 font-ubuntu-mono text-xs">{item.caption}</span>
            )}
            {item.description && (
              <p className="text-white/75 font-open-sans text-sm sm:text-base mt-0.5 leading-relaxed">
                {item.description}
              </p>
            )}
          </div>
        )}

        {many && (
          <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
            {items.map((_, i) => (
              <button
                key={i}
                onClick={() => navigateViewer(i)}
                className={`w-3 h-3 border-2 border-white shadow-[2px_2px_0px_0px_rgba(255,255,255,0.25)] transition-colors duration-150 ${
                  i === index ? "bg-primary" : "bg-white/25 hover:bg-white/60"
                }`}
                aria-label={`Go to image ${i + 1}`}
                aria-current={i === index ? "true" : "false"}
              />
            ))}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
