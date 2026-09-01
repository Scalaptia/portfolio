// One viewer, several openers.
//
// Three separate Astro islands can open an image: HighlightGallery, and MediaGallery in both its
// carousel and grid modes. Islands are independent React roots, so they cannot share context, but
// they do share the browser's module graph. The open image therefore lives here, in module scope,
// and everyone subscribes.
//
// This file stays free of React and of three.js on purpose: an inline Astro script imports it too.

import type * as Faces from "@/components/pc-model/faces";
import type { MediaItem } from "@/components/MediaLightbox";

// Erased at build time, so naming the palette here costs nothing at runtime.
export type CrtScheme = keyof typeof Faces.CRT_COLORS;

export interface ViewerState {
  open: boolean;
  items: MediaItem[];
  index: number;
  scheme: CrtScheme;
  /** Which gallery opened it, so that gallery alone follows along as you navigate. */
  ownerId: string | null;
}

export interface OpenOptions {
  scheme?: CrtScheme;
  ownerId?: string;
}

const CLOSED: ViewerState = {
  open: false,
  items: [],
  index: 0,
  scheme: "green",
  ownerId: null,
};

let state: ViewerState = CLOSED;
const listeners = new Set<(state: ViewerState) => void>();

function emit() {
  listeners.forEach((fn) => fn(state));
  // The PC model already listens for heroHover and pageInteraction this way, so the same event
  // style keeps its code shape when it starts reacting to the viewer.
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

export function openViewer(items: MediaItem[], index: number, options: OpenOptions = {}): void {
  if (!items.length) return;
  state = {
    open: true,
    items,
    index: wrap(index, items.length),
    scheme: options.scheme ?? "green",
    ownerId: options.ownerId ?? null,
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

let webglSupport: boolean | null = null;

function hasWebGL(): boolean {
  if (webglSupport !== null) return webglSupport;
  try {
    const probe = document.createElement("canvas");
    webglSupport = Boolean(probe.getContext("webgl2") || probe.getContext("webgl"));
  } catch {
    webglSupport = false;
  }
  return webglSupport;
}

/**
 * Whether the 3D viewer can carry the image. False sends the caller to the plain DOM lightbox:
 * no WebGL, or a reader who asked for less motion and should not get a camera dolly.
 */
export function isViewerAvailable(): boolean {
  if (typeof window === "undefined") return false;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return false;
  return hasWebGL();
}
