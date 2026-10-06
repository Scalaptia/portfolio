import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import PixelIcon, { type IconName } from "@/components/PixelIcon";
import CaseEars from "@/components/CaseEars";
import { play, preload } from "@/lib/sfx";
import { closeOS, launch, type AppId } from "@/lib/harogatos";
import { useOSState } from "@/lib/useOSState";
import Stacker, { Hiscores } from "./Stacker";
import Faces from "./Faces";
import { PHOSPHOR, phosphorVars, calmMotion } from "./phosphor";

// The monitor is the picture viewer's: same case, same bezel, same glass. The apps run on the
// screen and the buttons on the case switch between them.

const OPEN_MS = 180;
const GROW_MS = 280;
const CLOSE_MS = 200;

const BUTTON =
  "press [--press:3px] flex items-center justify-center gap-1.5 sm:gap-2 border-2 border-text bg-white text-text font-ubuntu-mono font-bold text-xs sm:text-sm min-h-11 sm:min-h-10";

interface Tab {
  id: AppId;
  label: string;
  icon: IconName;
}

const TABS: Tab[] = [
  { id: "stacker", label: "Stacker", icon: "gamepad" },
  { id: "hiscores", label: "Scores", icon: "trophy" },
  { id: "faces", label: "Draw", icon: "brush" },
  { id: "gallery", label: "Gallery", icon: "album" },
];

// A phone held upright gets a tube taller than it is wide, so the games are not postage stamps.
const TALL_QUERY = "(max-width: 639px) and (orientation: portrait)";

function useTall() {
  const [tall, setTall] = useState(() => window.matchMedia(TALL_QUERY).matches);
  useEffect(() => {
    const query = window.matchMedia(TALL_QUERY);
    const update = () => setTall(query.matches);
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  return tall;
}

export default function HarogatOS() {
  const { app } = useOSState();
  const [closing, setClosing] = useState(false);
  const calm = useRef(calmMotion()).current;
  const rootRef = useRef<HTMLDivElement>(null);
  const tabsRef = useRef<HTMLDivElement>(null);

  const requestClose = useCallback(() => {
    if (closing) return;
    setClosing(true);
    play("crt-off");
    if (calm) return closeOS();
    setTimeout(closeOS, CLOSE_MS);
  }, [closing, calm]);

  const toStacker = useCallback(() => launch("stacker"), []);

  useEffect(() => {
    // The screen switching on, same as the picture viewer. The games' sounds load now, so the
    // first block placed is not silent while its file arrives.
    play("crt-on");
    preload("stk-start", "stk-place", "stk-perfect", "stk-chop", "stk-over", "stk-win", "ui-key", "ui-pen", "ui-erase", "face-sent", "crt-off");
    const before = document.activeElement as HTMLElement | null;
    document.body.style.overflow = "hidden";
    tabsRef.current?.querySelector<HTMLElement>("[aria-current]")?.focus({ preventScroll: true });
    return () => {
      document.body.style.overflow = "";
      before?.focus?.({ preventScroll: true });
    };
  }, []);

  // Keep Tab inside the window while it is open.
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key !== "Tab" || !rootRef.current) return;
    const focusable = [...rootRef.current.querySelectorAll<HTMLElement>("button, input, [tabindex='0']")].filter(
      (el) => !el.hasAttribute("disabled") && el.offsetParent !== null,
    );
    if (!focusable.length) return;
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

  const tall = useTall();
  const fade = (open: boolean) =>
    calm ? undefined : `${open ? "os-in" : "os-out"} ${open ? OPEN_MS : CLOSE_MS}ms ease-out both`;

  // The window is the PC's screen made big, so it grows out of the PC and shrinks back into it.
  // Pages without the PC on screen get the plain fade.
  const [from] = useState(() => {
    const pc = document.getElementById("pc-model-container")?.getBoundingClientRect();
    if (!pc || pc.bottom < 0 || pc.top > innerHeight || pc.width === 0) return null;
    return {
      "--os-ox": `${pc.left + pc.width / 2 - innerWidth / 2}px`,
      "--os-oy": `${pc.top + pc.height * 0.4 - innerHeight / 2}px`,
    } as React.CSSProperties;
  });
  const caseMotion = (open: boolean) =>
    calm
      ? undefined
      : from
        ? `${open ? "os-grow" : "os-shrink"} ${open ? GROW_MS : CLOSE_MS}ms ${open ? "cubic-bezier(0.2, 0.7, 0.2, 1)" : "ease-in"} both`
        : fade(open);

  return createPortal(
    <div
      ref={rootRef}
      role="dialog"
      aria-modal="true"
      aria-label="harogatOS"
      onKeyDown={onKeyDown}
      className="fixed inset-0 z-70 flex items-center justify-center px-2 pt-10 pb-3 sm:px-6 sm:pt-14 sm:pb-8 [@media(max-height:520px)]:pt-9 [@media(max-height:520px)]:pb-1.5"
      onClick={requestClose}
    >
      <div className="absolute inset-0 bg-text/85" style={{ animation: fade(!closing) }} />

      <div
        onClick={(e) => e.stopPropagation()}
        className={`relative z-10 bg-background border-4 border-text ${
          tall ? "w-full h-full flex flex-col" : ""
        }`}
        style={{ ...from, animation: caseMotion(!closing) }}
      >
        <CaseEars />
        {/* An upright phone gets the whole screen: the case fills the dialog and the glass takes
            whatever the button bar leaves. Anything else keeps the monitor's 4:3 shape. */}
        <div className={`p-2 sm:p-4 [@media(max-height:520px)]:p-2 flex justify-center ${tall ? "flex-1 min-h-0" : ""}`}>
          <div className={`bg-text p-1 sm:p-2.5 ${tall ? "flex-1 flex" : ""}`} style={{ borderRadius: "32px / 40px" }}>
            <div
              className={`crt-screen os-screen crt-glass crt-scanlines crt-curve select-none @container-size ${tall ? "os-fill" : ""}`}
              style={{
                ...phosphorVars(PHOSPHOR.amber),
                "--crt-aspect": tall ? "0.78" : "1.3333",
              } as React.CSSProperties}
            >
              <div
                className={`absolute inset-0 font-ubuntu-mono leading-[1.35] ${
                  tall ? "text-[max(12px,4.8cqw)]" : "text-[max(12px,4.4cqh)]"
                }`}
              >
                {app === "hiscores" ? (
                  <Hiscores onExit={toStacker} />
                ) : app === "faces" || app === "gallery" ? (
                  <Faces onExit={requestClose} tall={tall} mode={app === "gallery" ? "gallery" : "draw"} />
                ) : (
                  <Stacker onExit={requestClose} tall={tall} />
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1 sm:gap-2 px-2 pb-2 sm:px-4 sm:pb-4 [@media(max-height:520px)]:px-2 [@media(max-height:520px)]:pb-2">
          <span className="hidden sm:flex items-center gap-1.5 font-black-han-sans text-text text-base pl-1">
            <span className="w-2 h-2 bg-primary" aria-hidden="true" />
            harogatOS
          </span>
          <div className="flex-1" />
          <div ref={tabsRef} className="flex gap-1 sm:gap-2">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  if (app !== tab.id) play("case-button");
                  launch(tab.id);
                }}
                aria-current={app === tab.id ? "page" : undefined}
                className={`${BUTTON} px-2 sm:px-3 ${app === tab.id ? "bg-primary! text-white!" : ""}`}
              >
                <PixelIcon name={tab.icon} className="hidden sm:block w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>
          {/* Off, like the picture viewer's power button. Icon only, so five buttons fit a phone. */}
          <button onClick={requestClose} className={`${BUTTON} w-11 sm:w-10 shrink-0`} aria-label="Shut down" title="Shut down">
            <PixelIcon name="power" className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
