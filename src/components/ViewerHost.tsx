import { MediaLightbox } from "./MediaLightbox";
import { closeViewer, navigateViewer } from "@/lib/crtViewer";
import { useViewerState } from "@/lib/useViewerState";

// Mounted once in the layout. Every gallery on the page opens images through the store, and this
// is the one thing that renders them.
export default function ViewerHost() {
  const { open, items, index } = useViewerState();

  return (
    <MediaLightbox
      isOpen={open}
      onClose={closeViewer}
      items={items}
      currentIndex={index}
      onNavigate={navigateViewer}
    />
  );
}
