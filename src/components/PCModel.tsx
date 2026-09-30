import { lazy, Suspense, useEffect, useState } from "react";

// three.js and drei are 888 KB of the site's 1,141 KB of JavaScript. Nothing above the fold needs
// them, so the canvas is a separate chunk that only starts downloading once the browser is idle.
// Everything three-related lives in PCModelCanvas so this module stays free of those imports.
const PCModelCanvas = lazy(() => import("./PCModelCanvas"));

export default function PCModel() {
  const [ready, setReady] = useState(false);
  const [projectTitle, setProjectTitle] = useState("");

  useEffect(() => {
    const onProject = (event: Event) => {
      const { type, hovered, title } = (event as CustomEvent).detail;
      if (type === "project") setProjectTitle(hovered ? (title ?? "") : "");
    };
    window.addEventListener("pageInteraction", onProject);
    return () => window.removeEventListener("pageInteraction", onProject);
  }, []);

  useEffect(() => {
    const idle = window.requestIdleCallback;
    if (idle) {
      const handle = idle(() => setReady(true), { timeout: 2500 });
      return () => window.cancelIdleCallback?.(handle);
    }

    // Safari has no requestIdleCallback, so fall back to a short timer.
    const timer = window.setTimeout(() => setReady(true), 1200);
    return () => window.clearTimeout(timer);
  }, []);

  if (!ready) return <div className="w-full h-full" aria-hidden="true" />;

  return (
    <>
      <Suspense fallback={<div className="w-full h-full" aria-hidden="true" />}>
        <PCModelCanvas />
      </Suspense>
      {projectTitle && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap border-2 border-text bg-background px-3 py-1 font-ubuntu-mono text-xs text-text"
        >
          {projectTitle}
        </span>
      )}
    </>
  );
}
