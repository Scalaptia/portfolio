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
const typing = (target: EventTarget | null) => {
  const el = target as HTMLElement | null;
  return !!el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName));
};

// Mounted once in the layout. Listens for the ways in and renders the window when it is open.
export default function HarogatOSHost() {
  const { open } = useOSState();

  useEffect(() => {
    let keys: string[] = [];

    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || typing(e.target)) return;

      const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      keys = [...keys, key].slice(-KONAMI.length);

      if (keys.length === KONAMI.length && keys.every((k, i) => k === KONAMI[i])) {
        keys = [];
        openOS("stacker");
      }
    };

    // Anything with data-harogatos opens it, at the app it names. The play button under the PC and
    // the footer link are two.
    const onClick = (e: MouseEvent) => {
      const opener = (e.target as HTMLElement | null)?.closest<HTMLElement>("[data-harogatos]");
      if (!opener) return;
      e.preventDefault();
      openOS((opener.dataset.harogatos || "stacker") as AppId);
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
