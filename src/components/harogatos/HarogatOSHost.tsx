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
// Links straight into an app: fharo.dev/#draw, #gallery, #picross, #play, #scores, and #harogatos for
// the menu. /draw and /play redirect here too (astro.config.mjs), so a link to the face editor can
// be sent to someone.
const LINKS: Record<string, AppId> = {
  harogatos: "menu",
  draw: "faces",
  gallery: "gallery",
  picross: "picross",
  play: "stacker",
  scores: "hiscores",
};
const HASHES = Object.fromEntries(Object.entries(LINKS).map(([hash, app]) => [app, hash])) as Record<AppId, string>;

const linkedApp = () => LINKS[location.hash.slice(1).toLowerCase()];

const typing = (target: EventTarget | null) => {
  const el = target as HTMLElement | null;
  return !!el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName));
};

// Mounted once in the layout. Listens for the ways in and renders the window when it is open.
export default function HarogatOSHost() {
  const { open, app } = useOSState();

  // Arriving on a link, or the hash changing while on the page, opens the app it names.
  useEffect(() => {
    const follow = () => {
      const linked = linkedApp();
      if (linked) openOS(linked);
    };
    follow();
    window.addEventListener("hashchange", follow);
    return () => window.removeEventListener("hashchange", follow);
  }, []);

  // While it is open, the address bar says which app, so the link can be copied from there. Closed,
  // the hash goes away, so a reload does not open it again. replaceState adds no history entries.
  useEffect(() => {
    const want = open ? `#${HASHES[app]}` : "";
    if (location.hash === want || (!open && !linkedApp())) return;
    history.replaceState(history.state, "", `${location.pathname}${location.search}${want}`);
  }, [open, app]);

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

    // Anything with data-harogatos opens it, at the app it names or at the menu. The boot button
    // under the PC and the footer link are two.
    const onClick = (e: MouseEvent) => {
      const opener = (e.target as HTMLElement | null)?.closest<HTMLElement>("[data-harogatos]");
      if (!opener) return;
      e.preventDefault();
      openOS((opener.dataset.harogatos || "menu") as AppId);
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
