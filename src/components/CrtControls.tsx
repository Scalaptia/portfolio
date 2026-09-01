import { useEffect, useRef, useState } from "react";
import PixelIcon from "./PixelIcon";
import { closeViewer, navigateViewer, stepViewer } from "@/lib/crtViewer";
import { useViewerState } from "@/lib/useViewerState";

const MIN_SWIPE = 50;

// The picture is on the model's screen, inside a canvas. Everything you can press is here, in
// ordinary DOM on top of it, so the viewer keeps a focus order, a label, and a keyboard.
export default function CrtControls() {
  const { items, index } = useViewerState();
  const [touchStart, setTouchStart] = useState(0);
  const closeRef = useRef<HTMLButtonElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);

  const item = items[index];
  const hasMultiple = items.length > 1;

  // Take focus on open and keep Tab inside the viewer while it is up.
  useEffect(() => {
    closeRef.current?.focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      const focusable = frameRef.current?.querySelectorAll<HTMLElement>("button");
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

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <div ref={frameRef} role="dialog" aria-modal="true" aria-label="Photo viewer">
      {/* A canvas says nothing to a screen reader, so say it here instead. */}
      <div className="sr-only" aria-live="polite">
        {`Image ${index + 1} of ${items.length}. ${item?.description || item?.alt || ""}`}
      </div>

      {/* Anywhere off the machine closes it, and a swipe moves along the set. */}
      <div
        className="fixed inset-0 z-[61]"
        onClick={closeViewer}
        role="presentation"
        onTouchStart={(e) => setTouchStart(e.changedTouches[0].screenX)}
        onTouchEnd={(e) => {
          if (!hasMultiple) return;
          const distance = touchStart - e.changedTouches[0].screenX;
          if (Math.abs(distance) > MIN_SWIPE) stepViewer(distance > 0 ? 1 : -1);
        }}
      />

      <button
        ref={closeRef}
        onClick={closeViewer}
        className="fixed top-3 right-3 sm:top-5 sm:right-5 z-[62] p-2.5 sm:p-3 border-2 border-white bg-text text-white shadow-[2px_2px_0px_0px_rgba(255,255,255,0.3)] transition-all duration-150"
        aria-label="Close"
      >
        <PixelIcon name="x" className="w-5 h-5" />
      </button>

      {hasMultiple && (
        <>
          <button
            onClick={() => stepViewer(-1)}
            className="fixed left-2 sm:left-6 top-1/2 -translate-y-1/2 z-[62] p-3 sm:p-4 border-2 border-white bg-text text-white shadow-[3px_3px_0px_0px_rgba(255,255,255,0.3)] transition-all duration-150 hidden sm:flex items-center justify-center"
            aria-label="Previous"
          >
            <PixelIcon name="arrow-left" className="w-6 h-6" />
          </button>
          <button
            onClick={() => stepViewer(1)}
            className="fixed right-2 sm:right-6 top-1/2 -translate-y-1/2 z-[62] p-3 sm:p-4 border-2 border-white bg-text text-white shadow-[3px_3px_0px_0px_rgba(255,255,255,0.3)] transition-all duration-150 hidden sm:flex items-center justify-center"
            aria-label="Next"
          >
            <PixelIcon name="arrow-right" className="w-6 h-6" />
          </button>
        </>
      )}

      {/* On the chin, where a label belongs. The model publishes these three custom properties
          every frame, so the caption rides along with it instead of waiting on React. */}
      <div
        className="fixed z-[62] -translate-x-1/2 px-3 text-center pointer-events-none"
        style={{
          left: "var(--crt-x, 50%)",
          top: "calc(var(--crt-glass-bottom, 50%) + 0.9rem)",
          width: "calc(var(--crt-glass-half, 20vw) * 2)",
        }}
      >
        <p className="font-ubuntu-mono text-[11px] sm:text-xs text-text/70 truncate">
          {hasMultiple ? `${index + 1} / ${items.length}` : ""}
          {item?.caption ? `${hasMultiple ? "  ·  " : ""}${item.caption}` : ""}
        </p>
        {item?.description && (
          <p className="font-ubuntu-mono text-[11px] sm:text-xs text-text/50 truncate mt-0.5">
            {item.description}
          </p>
        )}
      </div>

      {hasMultiple && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[62] flex gap-2">
          {items.map((_, i) => (
            <button
              key={i}
              onClick={() => navigateViewer(i)}
              className={`w-3 h-3 border-2 border-white shadow-[2px_2px_0px_0px_rgba(255,255,255,0.3)] transition-colors duration-150 ${
                i === index ? "bg-primary" : "bg-white/30 hover:bg-white/60"
              }`}
              aria-label={`Go to image ${i + 1}`}
              aria-current={i === index ? "true" : "false"}
            />
          ))}
        </div>
      )}
    </div>
  );
}
