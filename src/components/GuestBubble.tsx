import { useEffect, useState } from "react";
import { getShown, subscribeShown, startRotation, type Shown } from "@/lib/guestFaceShow";

const TEXT = {
  en: { by: "face by", pending: "only you can see this until Fernando approves it" },
  es: { by: "cara de", pending: "solo tú la ves hasta que Fernando la apruebe" },
};

// The speech bubble that says whose face the PC is wearing. It hangs under the PC in the hero and
// over it once the PC has floated into the corner, where under would be off the screen.
export default function GuestBubble() {
  const [shown, setShown] = useState<Shown | null>(getShown);
  const [above, setAbove] = useState(false);

  useEffect(() => {
    void startRotation();
    return subscribeShown((next) => {
      const container = document.getElementById("pc-model-container");
      setAbove(!!container && getComputedStyle(container).position === "fixed");
      setShown(next);
    });
  }, []);

  const visible = !!shown?.bubble;

  // The "click me" hint sits where the bubble goes.
  useEffect(() => {
    const hint = document.getElementById("click-me-text");
    if (hint) hint.style.visibility = visible ? "hidden" : "";
  }, [visible]);

  if (!shown || !visible) return null;

  const t = document.documentElement.lang === "es" ? TEXT.es : TEXT.en;
  const { author, message } = shown.face;

  return (
    <div
      role="status"
      className={`absolute left-1/2 -translate-x-1/2 z-20 w-[min(240px,80vw)] pointer-events-none ${
        above ? "bottom-full mb-3" : "top-full mt-2"
      }`}
      style={{ animation: "guest-bubble-in 180ms ease-out both" }}
    >
      <div className="relative bg-white border-2 border-text shadow-[3px_3px_0px_0px_rgba(65,44,71,1)] px-3 py-2 font-ubuntu-mono text-xs text-text text-center leading-snug">
        {/* The tail, pointing at the PC */}
        <span
          className={`absolute left-1/2 -translate-x-1/2 w-3 h-3 bg-white border-text rotate-45 ${
            above ? "-bottom-[7px] border-r-2 border-b-2" : "-top-[7px] border-l-2 border-t-2"
          }`}
        />
        {message && <p className="text-sm break-words">"{message}"</p>}
        <p className={message ? "mt-1 text-primary font-bold" : "text-primary font-bold"}>
          {t.by} {author}
        </p>
        {shown.pending && <p className="mt-1 text-[10px] text-text/60">{t.pending}</p>}
      </div>
    </div>
  );
}
