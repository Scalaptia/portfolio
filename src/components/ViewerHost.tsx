import { useEffect, useRef } from "react";
import CrtLightbox from "./CrtLightbox";
import { subscribe } from "@/lib/crtViewer";
import { useViewerState } from "@/lib/useViewerState";

// Mounted once in the layout. Every gallery on the site opens pictures through the store, and this
// is the only thing that renders one.
export default function ViewerHost() {
  const { open } = useViewerState();
  const opener = useRef<HTMLElement | null>(null);

  // The store notifies synchronously from inside the click handler, before React has rendered
  // anything, so this catches whatever was focused before the monitor stole it.
  useEffect(
    () =>
      subscribe((state) => {
        if (state.open) opener.current = document.activeElement as HTMLElement | null;
      }),
    [],
  );

  useEffect(() => {
    if (open) return;
    opener.current?.focus?.({ preventScroll: true });
    opener.current = null;
  }, [open]);

  return open ? <CrtLightbox /> : null;
}
