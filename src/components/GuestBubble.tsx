import { useEffect, useState } from "react";
import { getShown, subscribeShown, startRotation, type Shown } from "@/lib/guestFaceShow";

const TEXT = {
  en: { by: "face by", pending: "only you can see this until it's approved" },
  es: { by: "cara de", pending: "solo tú la ves hasta que se apruebe" },
};

// Where the bubble's bottom edge goes, in px up from the bottom of the PC's box. In the hero it
// ends just above the Play and Draw buttons and grows up over the PC's base, so it never covers
// them. Once the PC has floated into the corner it goes above it, where under would be off screen.
function placement(): { above: boolean; bottom: number } {
  const container = document.getElementById("pc-model-container");
  if (!container || getComputedStyle(container).position === "fixed") return { above: true, bottom: 0 };
  const actions = document.getElementById("pc-actions");
  if (!actions) return { above: false, bottom: 0 };
  const box = container.getBoundingClientRect();
  return { above: false, bottom: box.bottom - actions.getBoundingClientRect().top + 8 };
}

// The speech bubble that says whose face the PC is wearing.
export default function GuestBubble() {
  const [shown, setShown] = useState<Shown | null>(getShown);
  const [place, setPlace] = useState(placement);

  useEffect(() => {
    void startRotation();
    return subscribeShown((next) => {
      setPlace(placement());
      setShown(next);
    });
  }, []);

  const visible = !!shown?.bubble;

  // The PC floats into the corner past a certain scroll, and the bubble has to follow it there.
  useEffect(() => {
    if (!visible) return;
    const update = () => setPlace(placement());
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [visible]);

  // The "click me" caption sits where the bubble ends. The buttons under it stay.
  useEffect(() => {
    const caption = document.getElementById("click-me-caption");
    if (caption) caption.style.visibility = visible ? "hidden" : "";
  }, [visible]);

  if (!shown || !visible) return null;

  const t = document.documentElement.lang === "es" ? TEXT.es : TEXT.en;
  const { author, message } = shown.face;

  return (
    <div
      role="status"
      className={`absolute left-1/2 -translate-x-1/2 z-20 w-[min(240px,80vw)] pointer-events-none ${
        place.above ? "bottom-full mb-3" : ""
      }`}
      style={{ animation: "guest-bubble-in 180ms ease-out both", ...(place.above ? {} : { bottom: place.bottom }) }}
    >
      <div className="relative bg-white border-2 border-text shadow-[3px_3px_0px_0px_rgba(65,44,71,1)] px-3 py-2 font-ubuntu-mono text-xs text-text text-center leading-snug">
        {/* The tail, pointing at the PC's screen */}
        <span
          className={`absolute left-1/2 -translate-x-1/2 w-3 h-3 bg-white border-text rotate-45 ${
            place.above ? "bottom-[-7px] border-r-2 border-b-2" : "top-[-7px] border-l-2 border-t-2"
          }`}
        />
        {message && <p className="text-sm wrap-break-word">"{message}"</p>}
        <p className={message ? "mt-1 text-primary font-bold" : "text-primary font-bold"}>
          {t.by} {author}
        </p>
        {shown.pending && <p className="mt-1 text-[10px] text-text/60">{t.pending}</p>}
      </div>
    </div>
  );
}
