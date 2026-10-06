import { useEffect, useState } from "react";
import PixelIcon, { type IconName } from "@/components/PixelIcon";
import { play } from "@/lib/sfx";
import type { AppId } from "@/lib/harogatos";
import { INVERSE } from "./phosphor";
import { strings } from "./strings";

// What harogatOS shows when it boots: a list of what runs on it, like an arcade cabinet's game
// select. Arrows or a number pick, Enter or a tap starts it, Esc switches the PC off.

type Launchable = Exclude<AppId, "menu">;

const ITEMS: { id: Launchable; icon: IconName }[] = [
  { id: "stacker", icon: "gamepad" },
  { id: "picross", icon: "grid" },
  { id: "faces", icon: "brush" },
  { id: "gallery", icon: "album" },
  { id: "hiscores", icon: "trophy" },
];

export default function Menu({
  from,
  onLaunch,
  onExit,
  tall = false,
}: {
  /** The app the visitor just left, so the cursor starts on it. */
  from?: AppId;
  onLaunch: (app: Launchable) => void;
  onExit: () => void;
  tall?: boolean;
}) {
  const t = strings();
  const [picked, setPicked] = useState(() => Math.max(0, ITEMS.findIndex((item) => item.id === from)));

  const start = (i: number) => {
    play("case-button");
    onLaunch(ITEMS[i].id);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        play("ui-key");
        setPicked((p) => (p + (e.key === "ArrowDown" ? 1 : -1) + ITEMS.length) % ITEMS.length);
      } else if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        if (!e.repeat) start(picked);
      } else if (/^[1-9]$/.test(e.key) && Number(e.key) <= ITEMS.length) {
        e.preventDefault();
        start(Number(e.key) - 1);
      } else if (e.key === "Escape") {
        e.preventDefault();
        onExit();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [picked, onExit]);

  return (
    <div className={`absolute inset-0 flex flex-col justify-center ${tall ? "px-[5cqw] gap-[3cqh]" : "px-[9cqh] gap-[4cqh]"}`}>
      <div className="flex items-baseline justify-between gap-[2cqh]">
        <div className="text-[1.5em] leading-none">HAROGATOS</div>
        <div className="text-[0.7em] opacity-70">{t.menuPick}</div>
      </div>
      <ul className="flex flex-col gap-[1cqh]" role="menu" aria-label="harogatOS">
        {ITEMS.map((item, i) => {
          const on = i === picked;
          const label = t.menu[item.id];
          return (
            <li key={item.id} role="none">
              <button
                role="menuitem"
                onClick={() => start(i)}
                onPointerEnter={() => setPicked(i)}
                className={`w-full flex items-center gap-[2cqh] px-[1.6cqh] ${tall ? "py-[1.2cqh]" : "py-[0.8cqh]"} text-left ${on ? INVERSE : ""}`}
              >
                <span className="w-[1.2em] shrink-0 tabular-nums opacity-70">{on ? ">" : i + 1}</span>
                <PixelIcon name={item.icon} className="w-[1.1em] h-[1.1em] shrink-0" />
                {/* An upright phone puts the line about it underneath, so every row wraps the same. */}
                <span className={`flex-1 min-w-0 flex ${tall ? "flex-col" : "flex-wrap items-baseline gap-x-[2cqh]"}`}>
                  <span>{label.name}</span>
                  <span className={`text-[0.7em] ${on ? "" : "opacity-70"}`}>{label.about}</span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
