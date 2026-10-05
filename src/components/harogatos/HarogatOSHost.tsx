import { lazy, Suspense, useEffect } from "react";
import { openOS, type AppId } from "@/lib/harogatos";
import { useOSState } from "@/lib/useOSState";

// The window and its games are a separate chunk. Nobody downloads Stacker to read a resume.
const HarogatOS = lazy(() => import("./HarogatOS"));

const KONAMI = [
  "ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown",
  "ArrowLeft", "ArrowRight", "ArrowLeft", "ArrowRight",
  "b", "a",
];
// Typing either of these anywhere that is not a text field boots the machine.
const WORDS = ["play", "harogatos"];

const typing = (target: EventTarget | null) => {
  const el = target as HTMLElement | null;
  return !!el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName));
};

// Mounted once in the layout. Listens for the ways in and renders the window when it is open.
export default function HarogatOSHost() {
  const { open } = useOSState();

  useEffect(() => {
    let keys: string[] = [];
    let letters = "";

    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || typing(e.target)) return;

      const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      keys = [...keys, key].slice(-KONAMI.length);
      letters = (letters + (key.length === 1 ? key : " ")).slice(-12);

      const konami = keys.length === KONAMI.length && keys.every((k, i) => k === KONAMI[i]);
      if (konami || WORDS.some((word) => letters.endsWith(word))) {
        keys = [];
        letters = "";
        openOS(konami ? "stacker" : "desktop");
      }
    };

    // Anything with data-harogatos opens it, at the app it names. The footer prompt is one.
    const onClick = (e: MouseEvent) => {
      const opener = (e.target as HTMLElement | null)?.closest<HTMLElement>("[data-harogatos]");
      if (!opener) return;
      e.preventDefault();
      openOS((opener.dataset.harogatos || "desktop") as AppId);
    };

    window.addEventListener("keydown", onKey);
    document.addEventListener("click", onClick);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.removeEventListener("click", onClick);
    };
  }, []);

  if (!open) return null;
  return (
    <Suspense fallback={null}>
      <HarogatOS />
    </Suspense>
  );
}
