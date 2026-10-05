import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import PixelIcon from "@/components/PixelIcon";
import { closeOS, launch, type AppId } from "@/lib/harogatos";
import { useOSState } from "@/lib/useOSState";
import { playBootSound, playPowerDownSound, playNotes } from "@/components/pc-model/sounds";
import { FACES } from "@/components/pc-model/faces";
import FaceIcon from "./FaceIcon";
import Stacker, { Hiscores } from "./Stacker";
import Faces from "./Faces";
import { PHOSPHOR, phosphorVars, INVERSE, calmMotion } from "./phosphor";

// The monitor is the picture viewer's: same case, same bezel, same glass. Inside it, a small
// operating system with a boot screen, a desktop and whatever apps are installed.

const OPEN_MS = 540;
const CLOSE_MS = 260;

const BUTTON =
  "press [--press:3px] flex items-center justify-center border-2 border-text bg-white text-text";

const BOOT_LINES = [
  "HARO SYSTEMS BIOS v2.6",
  "CPU  GATO-86 @ 4.77 MHz",
  "MEMORY TEST ........ 640K OK",
  "DETECTING SNACKS ... FOUND",
  "LOADING harogatOS",
];
const BOOT_LINE_MS = 170;
// Boot once a visit. After that the machine is warm and opens straight to the desktop.
const BOOTED_KEY = "harogatos:booted";

interface MenuItem {
  id: AppId | "shutdown";
  label: string;
  hint: string;
  /** Which of the PC's faces watches while this is selected. */
  face: number;
}

const MENU: MenuItem[] = [
  { id: "stacker", label: "STACKER.EXE", hint: "stack blocks to the top", face: 6 },
  { id: "hiscores", label: "HISCORES.TXT", hint: "the best stackers", face: 7 },
  { id: "faces", label: "FACES.EXE", hint: "draw a face for the PC", face: 4 },
  { id: "shutdown", label: "SHUTDOWN", hint: "back to the site", face: 5 },
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

const clock = () =>
  new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });

function Boot({ onDone }: { onDone: () => void }) {
  const [shown, setShown] = useState(0);

  useEffect(() => {
    if (shown >= BOOT_LINES.length) {
      const t = setTimeout(onDone, 420);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setShown((n) => n + 1), BOOT_LINE_MS);
    return () => clearTimeout(t);
  }, [shown, onDone]);

  // Any key or click skips it. Nobody wants to watch a BIOS twice.
  useEffect(() => {
    const skip = (e: KeyboardEvent) => {
      if (e.key === "Escape") return;
      onDone();
    };
    window.addEventListener("keydown", skip);
    return () => window.removeEventListener("keydown", skip);
  }, [onDone]);

  return (
    <div className="absolute inset-0 p-[6cqh] leading-[1.5] cursor-pointer" onClick={onDone}>
      {BOOT_LINES.slice(0, shown).map((line) => (
        <div key={line} className="whitespace-pre">
          {line}
        </div>
      ))}
      <span className="inline-block w-[0.6em] h-[1em] align-middle bg-[var(--fg)] crt-led" />
    </div>
  );
}

function Desktop({ onShutdown, tall }: { onShutdown: () => void; tall: boolean }) {
  const [selected, setSelected] = useState(0);
  const [time, setTime] = useState(clock);

  useEffect(() => {
    const t = setInterval(() => setTime(clock()), 10_000);
    return () => clearInterval(t);
  }, []);

  const run = useCallback(
    (item: MenuItem) => {
      playNotes([[880, 0, 0.05], [1320, 0.05, 0.08]]);
      if (item.id === "shutdown") onShutdown();
      else launch(item.id);
    },
    [onShutdown],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        setSelected((i) => (i + (e.key === "ArrowDown" ? 1 : MENU.length - 1)) % MENU.length);
        playNotes([[660, 0, 0.03]], 0.05);
      } else if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        run(MENU[selected]);
      } else if (e.key === "Escape") {
        onShutdown();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selected, run, onShutdown]);

  const face = FACES[MENU[selected].face];

  return (
    <div className="absolute inset-0 flex flex-col">
      <div className={`flex justify-between px-[3cqh] py-[0.8cqh] ${INVERSE}`}>
        <span>harogatOS</span>
        <span>{time}</span>
      </div>

      <div
        className={`flex-1 flex items-center ${
          tall ? "flex-col justify-center gap-[3cqh] px-[5cqw]" : "gap-[6cqh] px-[7cqh]"
        }`}
      >
        <div className="flex flex-col items-center gap-[2cqh] shrink-0">
          <div className="border-[0.5cqh] border-[var(--fg)] p-[1cqh] shadow-[0_0_1.5cqh_var(--glow)]">
            <FaceIcon
              art={face.art}
              color={face.color}
              accent={face.accent}
              className={tall ? "w-[24cqh] h-[24cqh]" : "w-[30cqh] h-[30cqh]"}
            />
          </div>
          <span className="text-[0.8em] opacity-80">HARO-PC</span>
        </div>

        <ul className={tall ? "w-full" : "flex-1 min-w-0"} role="menu">
          {MENU.map((item, i) => (
            <li key={item.id} role="none">
              <button
                role="menuitem"
                onMouseEnter={() => setSelected(i)}
                onFocus={() => setSelected(i)}
                onClick={() => run(item)}
                className={`w-full text-left px-[1.5cqh] py-[0.9cqh] flex flex-col outline-none ${
                  i === selected ? INVERSE : ""
                }`}
              >
                <span>
                  {i === selected ? "> " : "  "}
                  {item.label}
                </span>
                <span className="pl-[2ch] text-[0.75em] opacity-80">{item.hint}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div className="px-[3cqh] py-[1.2cqh] text-[0.75em] opacity-70 border-t-[0.4cqh] border-[var(--dim)] flex justify-between gap-[2cqh]">
        <span className="hidden sm:inline">ARROWS SELECT · ENTER RUN · ESC QUIT</span>
        <span className="sm:hidden">TAP TO RUN</span>
        <span>C:\&gt;_</span>
      </div>
    </div>
  );
}

export default function HarogatOS() {
  const { app } = useOSState();
  const [closing, setClosing] = useState(false);
  const [booted, setBooted] = useState(() => {
    try {
      return sessionStorage.getItem(BOOTED_KEY) === "1";
    } catch {
      return false;
    }
  });
  const calm = useRef(calmMotion()).current;
  const rootRef = useRef<HTMLDivElement>(null);

  const finishBoot = useCallback(() => {
    setBooted(true);
    try {
      sessionStorage.setItem(BOOTED_KEY, "1");
    } catch {
      // Private mode. It will boot again next time, which is fine.
    }
  }, []);

  const requestClose = useCallback(() => {
    if (closing) return;
    setClosing(true);
    playPowerDownSound();
    if (calm) return closeOS();
    setTimeout(closeOS, CLOSE_MS);
  }, [closing, calm]);

  const home = useCallback(() => launch("desktop"), []);

  useEffect(() => {
    playBootSound();
    const before = document.activeElement as HTMLElement | null;
    document.body.style.overflow = "hidden";
    rootRef.current?.focus({ preventScroll: true });
    return () => {
      document.body.style.overflow = "";
      before?.focus?.({ preventScroll: true });
    };
  }, []);

  const phosphor = app === "stacker" ? PHOSPHOR.amber : PHOSPHOR.green;
  const tall = useTall();

  return createPortal(
    <div
      ref={rootRef}
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
      aria-label="harogatOS"
      className="fixed inset-0 z-[70] flex items-center justify-center px-2 py-3 sm:px-6 sm:py-8 outline-none"
      onClick={requestClose}
    >
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

      <div
        onClick={(e) => e.stopPropagation()}
        className="relative z-10 bg-background border-4 border-text shadow-[8px_8px_0px_0px_rgba(253,141,117,0.85)]"
        style={{
          animation: calm
            ? undefined
            : closing
              ? `crt-case-out ${CLOSE_MS}ms cubic-bezier(0.4, 0, 1, 1) both`
              : `crt-case-in ${OPEN_MS}ms cubic-bezier(0.22, 0.9, 0.24, 1) both`,
        }}
      >
        <div className="p-2 sm:p-4">
          <div className="bg-text p-1 sm:p-2.5" style={{ borderRadius: "32px / 40px" }}>
            <div
              className="crt-screen crt-glass crt-scanlines crt-curve select-none [container-type:size]"
              style={{
                ...phosphorVars(phosphor),
                transition: "background 300ms ease",
                "--crt-aspect": tall ? "0.78" : "1.3333",
              } as React.CSSProperties}
            >
              <div
                className={`absolute inset-0 font-ubuntu-mono crt-flicker leading-[1.35] ${
                  tall ? "text-[max(10px,4.8cqw)]" : "text-[max(10px,4.4cqh)]"
                }`}
                style={{
                  animation: calm
                    ? undefined
                    : closing
                      ? `crt-power-off ${CLOSE_MS}ms ease-in both`
                      : `crt-power-on ${OPEN_MS}ms cubic-bezier(0.22, 0.9, 0.24, 1) both`,
                }}
              >
                {!booted ? (
                  <Boot onDone={finishBoot} />
                ) : app === "stacker" ? (
                  <Stacker onExit={home} tall={tall} />
                ) : app === "hiscores" ? (
                  <Hiscores onExit={home} />
                ) : app === "faces" ? (
                  <Faces onExit={home} tall={tall} />
                ) : (
                  <Desktop onShutdown={requestClose} tall={tall} />
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 px-2 pb-2 sm:px-4 sm:pb-4">
          <span className="font-black-han-sans text-text text-sm sm:text-base pl-1">harogatOS</span>
          <span
            className="w-2 h-2 crt-led"
            style={{ background: phosphor.fg, boxShadow: `0 0 6px ${phosphor.fg}` }}
          />
          <div className="flex-1" />
          {booted && app !== "desktop" && (
            <button onClick={home} className={`${BUTTON} w-11 h-11 sm:w-10 sm:h-10`} aria-label="Desktop" title="Desktop">
              <PixelIcon name="home" className="w-5 h-5" />
            </button>
          )}
          <button onClick={requestClose} className={`${BUTTON} w-11 h-11 sm:w-10 sm:h-10`} aria-label="Shut down" title="Shut down">
            <PixelIcon name="power" className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
