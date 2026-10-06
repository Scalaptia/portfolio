// harogatOS, the little operating system on the PC.
//
// It opens on top of whatever page you are on, from the boot button under the PC, the link in the
// footer, a link to one app (fharo.dev/#play), or the Konami code. It boots to the menu. Like the picture viewer, the open state lives here in module scope so
// a plain script, the host island and the window itself all see the same thing. See crtViewer.ts.

export type AppId = "menu" | "stacker" | "hiscores" | "faces" | "gallery" | "picross";

export interface OSState {
  open: boolean;
  app: AppId;
}

const CLOSED: OSState = { open: false, app: "menu" };

let state: OSState = CLOSED;
const listeners = new Set<(state: OSState) => void>();

function emit() {
  listeners.forEach((fn) => fn(state));
  // The PC model listens for window events, so it can react without importing anything.
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("harogatos", { detail: state }));
  }
}

export function getOSState(): OSState {
  return state;
}

export function subscribeOS(fn: (state: OSState) => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

export function openOS(app: AppId = "menu"): void {
  state = { open: true, app };
  emit();
}

export function launch(app: AppId): void {
  if (!state.open) return openOS(app);
  state = { ...state, app };
  emit();
}

export function closeOS(): void {
  if (!state.open) return;
  state = CLOSED;
  emit();
}
