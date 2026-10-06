import { useEffect, useState } from "react";
import { getShown, subscribeShown, startRotation, type Shown } from "@/lib/guestFaceShow";

const TEXT = {
  en: { by: "face by", pending: "only you can see this until it's approved" },
  es: { by: "cara de", pending: "solo tú la ves hasta que se apruebe" },
};

// The speech bubble that says whose face the PC is wearing.
export default function GuestBubble() {
  const [shown, setShown] = useState<Shown | null>(getShown);

  useEffect(() => {
    void startRotation();
    return subscribeShown(setShown);
  }, []);

  const visible = !!shown?.bubble;

  if (!shown || !visible) return null;

  const t = document.documentElement.lang === "es" ? TEXT.es : TEXT.en;
  const { author, message } = shown.face;

  return (
    // Above the PC, its tail just clear of the ears, so the face stays in full view. 86% of the
    // PC's box from the bottom puts the tail's tip at the ears' tips, whether the PC is in the hero
    // or floating in the corner.
    <div
      role="status"
      className="absolute left-1/2 -translate-x-1/2 bottom-[86%] z-20 w-[min(240px,80vw)] pointer-events-none"
      style={{ animation: "guest-bubble-in 180ms ease-out both" }}
    >
      <div className="relative bg-white border-2 border-text shadow-[3px_3px_0px_0px_rgba(65,44,71,1)] px-3 py-2 font-ubuntu-mono text-xs text-text text-center leading-snug">
        {/* The tail, pointing down at the PC */}
        <span className="absolute left-1/2 -translate-x-1/2 bottom-[-7px] w-3 h-3 bg-white border-text border-r-2 border-b-2 rotate-45" />
        {/* Two lines at most, so a long note does not grow up into the page. The gallery has it whole. */}
        {message && <p className="text-sm wrap-break-word line-clamp-2">"{message}"</p>}
        <p className={message ? "mt-1 text-primary font-bold" : "text-primary font-bold"}>
          {t.by} {author}
        </p>
        {shown.pending && <p className="mt-1 text-[10px] text-text/60">{t.pending}</p>}
      </div>
    </div>
  );
}
