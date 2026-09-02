// One viewer, several openers.
//
// Half a dozen places on the site can open a picture: the highlight grid, MediaGallery in both its
// carousel and grid modes, the other-projects cards, the portrait in the about section. Astro
// islands are independent React roots, so they cannot share context, but they do share the
// browser's module graph. The open image therefore lives here, in module scope, and everyone
// subscribes.
//
// This file stays free of React on purpose: inline Astro scripts import it too.

import type * as Faces from "@/components/pc-model/faces";

// Erased at build time, so naming the palette here costs nothing at runtime.
export type CrtScheme = keyof typeof Faces.CRT_COLORS;

export interface MediaItem {
  /** "youtube" puts the embedded player behind the glass. src is the video id. */
  type: "image" | "video" | "youtube";
  src: string;
  alt?: string;
  caption?: string;
  description?: string;
  /** A larger or better-cropped file to show once it is open. */
  lightboxSrc?: string;
}

export interface ViewerState {
  open: boolean;
  items: MediaItem[];
  index: number;
  /** Tints the letterbox surround and the power light. Photos themselves stay untinted. */
  scheme: CrtScheme;
  /** Which gallery opened it, so that gallery alone follows along as you navigate. */
  ownerId: string | null;
  /** Centre of the thumbnail you clicked, so the monitor grows out of it. */
  origin: { x: number; y: number } | null;
}

export interface OpenOptions {
  scheme?: CrtScheme;
  ownerId?: string;
  origin?: { x: number; y: number } | null;
}

const CLOSED: ViewerState = {
  open: false,
  items: [],
  index: 0,
  scheme: "green",
  ownerId: null,
  origin: null,
};

let state: ViewerState = CLOSED;
const listeners = new Set<(state: ViewerState) => void>();

function emit() {
  listeners.forEach((fn) => fn(state));
  // The PC model already listens for heroHover and pageInteraction this way, so the same event
  // style lets a plain script react to the viewer without importing React.
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("crtViewer", { detail: state }));
  }
}

function wrap(index: number, length: number) {
  if (length <= 0) return 0;
  return ((index % length) + length) % length;
}

export function getViewerState(): ViewerState {
  return state;
}

export function subscribe(fn: (state: ViewerState) => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

/** Centre of an element in viewport pixels. Feed it the thumbnail that was clicked. */
export function originOf(el: Element | null | undefined): { x: number; y: number } | null {
  if (!el) return null;
  const rect = el.getBoundingClientRect();
  return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
}

export function openViewer(items: MediaItem[], index: number, options: OpenOptions = {}): void {
  if (!items.length) return;
  state = {
    open: true,
    items,
    index: wrap(index, items.length),
    scheme: options.scheme ?? "green",
    ownerId: options.ownerId ?? null,
    origin: options.origin ?? null,
  };
  emit();
}

export function navigateViewer(index: number): void {
  if (!state.open) return;
  state = { ...state, index: wrap(index, state.items.length) };
  emit();
}

export function stepViewer(delta: number): void {
  if (!state.open) return;
  navigateViewer(state.index + delta);
}

export function closeViewer(): void {
  if (!state.open) return;
  state = CLOSED;
  emit();
}
