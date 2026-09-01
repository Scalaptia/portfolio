import { useSyncExternalStore } from "react";
import { getViewerState, subscribe, type ViewerState } from "@/lib/crtViewer";

// Kept out of crtViewer.ts so that file stays importable from a plain Astro script.
export function useViewerState(): ViewerState {
  return useSyncExternalStore(subscribe, getViewerState, () => getViewerState());
}
