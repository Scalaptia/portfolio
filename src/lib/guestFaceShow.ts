// Which visitor's face the PC is wearing right now, if any.
//
// Now and then, while nobody is clicking it, the PC swaps its own face for one a visitor drew and
// a speech bubble says who drew it. The face you drew yourself is different: once you send it, the
// PC wears it for the rest of the session, before it is approved and only for you, and the others
// stop rotating. This module owns all of that. The 3D scene
// draws whatever is current and the wrapper around it draws the bubble; both just subscribe.

import { fetchFaces } from "./arcadeApi";
import type { GuestFace } from "./guestFaces";

export interface Shown {
  face: GuestFace;
  /** Drawn on this browser and not approved yet, so nobody else can see it. */
  pending: boolean;
  /** Your own face, drawn this session. The PC keeps it on and nothing replaces it. */
  pinned?: boolean;
  /** Whether the speech bubble is up. A pinned face stays on after its bubble goes. */
  bubble?: boolean;
}

const MY_FACE_KEY = "harogatos:myface";
// Session storage, so the pin ends when the tab does and the next visit is back to rotating.
const PINNED_KEY = "harogatos:pinned";
const FIRST_DELAY_MS = 9_000;
const BETWEEN_MS = 20_000;
const SHOW_MS = 7_000;

let current: Shown | null = null;
const listeners = new Set<(shown: Shown | null) => void>();
let pool: Shown[] = [];
let next = 0;
let timer: ReturnType<typeof setTimeout> | undefined;
let hideTimer: ReturnType<typeof setTimeout> | undefined;
let started = false;

function set(shown: Shown | null) {
  current = shown;
  listeners.forEach((fn) => fn(current));
}

export function getShown(): Shown | null {
  return current;
}

export function subscribeShown(fn: (shown: Shown | null) => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

export function myFace(): GuestFace | null {
  try {
    const raw = localStorage.getItem(MY_FACE_KEY);
    return raw ? (JSON.parse(raw) as GuestFace) : null;
  } catch {
    return null;
  }
}

export function rememberMyFace(face: GuestFace): void {
  try {
    localStorage.setItem(MY_FACE_KEY, JSON.stringify(face));
  } catch {
    // Not remembered across visits. It still shows this time.
  }
  try {
    sessionStorage.setItem(PINNED_KEY, String(face.id));
  } catch {
    // Pinned until the page reloads instead of until the tab closes.
  }
  pool = [{ face, pending: true, pinned: true }, ...pool.filter((s) => s.face.id !== face.id)];
  next = 0;
  clearTimeout(hideTimer);
  // harogatOS is still open over the PC when this runs. tick() waits for it to close.
  schedule(600);
}

function pinnedId(): number | null {
  try {
    const raw = sessionStorage.getItem(PINNED_KEY);
    return raw ? Number(raw) : null;
  } catch {
    return null;
  }
}

function schedule(delay: number) {
  clearTimeout(timer);
  timer = setTimeout(tick, delay);
}

function tick() {
  if (!pool.length) return;
  // Your own face is on for good. Nothing to rotate.
  if (current?.pinned && current.bubble === false) return;
  // Nobody is looking. Try again later.
  if (document.hidden) return schedule(BETWEEN_MS);
  // harogatOS is open over the page, so the PC cannot be seen. Check again shortly.
  if (document.querySelector('[aria-label="harogatOS"]')) return schedule(1500);
  const pinned = pool.find((s) => s.pinned);
  show(pinned ?? pool[next % pool.length]);
  if (!pinned) next++;
}

export function show(shown: Shown): void {
  set({ ...shown, bubble: true });
  clearTimeout(timer);
  clearTimeout(hideTimer);
  hideTimer = setTimeout(() => {
    if (shown.pinned) return set({ ...shown, bubble: false });
    set(null);
    schedule(BETWEEN_MS);
  }, SHOW_MS);
}

/** Clicking the PC hands it back its own face, unless the face is yours. Then only the bubble goes. */
export function dismissShown(): void {
  if (!current) return;
  clearTimeout(hideTimer);
  if (current.pinned) return set({ ...current, bubble: false });
  set(null);
  schedule(BETWEEN_MS);
}

export async function startRotation(): Promise<void> {
  if (started) return;
  started = true;

  const mine = myFace();
  const approved = (await fetchFaces()) ?? [];
  const approvedMine = mine && approved.some((f) => f.id === mine.id);

  const shuffled = approved
    .filter((f) => f.art.length)
    .map((face) => ({ face, pending: false, sort: Math.random() }))
    .sort((a, b) => a.sort - b.sort)
    .map(({ face, pending }) => ({ face, pending }));

  // Yours goes first, and says it is waiting until it has been approved. Drawn this session, it
  // goes straight back on after a reload.
  const pinned = !!mine && pinnedId() === mine.id;
  pool = mine
    ? [{ face: mine, pending: !approvedMine, pinned }, ...shuffled.filter((s) => s.face.id !== mine.id)]
    : shuffled;
  if (pool.length) schedule(pinned ? 0 : FIRST_DELAY_MS);
}
