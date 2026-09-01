import { useEffect } from "react";
import { MediaLightbox } from "./MediaLightbox";
import { closeViewer, navigateViewer, stepViewer } from "@/lib/crtViewer";
import { useViewerState } from "@/lib/useViewerState";

// Mounted once in the layout. Every gallery on the page opens images through the store; this
// renders the fallback lightbox for videos, for browsers without WebGL, and for anyone who asked
// for less motion. The model's own screen handles everything else, and this supplies its controls.
export default function ViewerHost() {
  const { open, items, index, mode } = useViewerState();
  const onScreen = open && mode === "crt";

  useEffect(() => {
    if (!onScreen) return;

    const onKey = (e: KeyboardEvent) => {
      switch (e.key) {
        case "Escape":
          closeViewer();
          break;
        case "ArrowLeft":
          e.preventDefault();
          stepViewer(-1);
          break;
        case "ArrowRight":
          e.preventDefault();
          stepViewer(1);
          break;
      }
    };

    // A photo that will not decode cannot go on the glass, so give up the takeover.
    const onFailed = () => closeViewer();

    document.addEventListener("keydown", onKey);
    window.addEventListener("crtViewerFailed", onFailed);
    return () => {
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("crtViewerFailed", onFailed);
    };
  }, [onScreen]);

  return (
    <>
      <MediaLightbox
        isOpen={open && mode === "dom"}
        onClose={closeViewer}
        items={items}
        currentIndex={index}
        onNavigate={navigateViewer}
      />

      {onScreen && (
        <div
          className="fixed inset-0 z-[61]"
          onClick={closeViewer}
          role="presentation"
        />
      )}
    </>
  );
}
