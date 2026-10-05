// Which visitor's face the PC is wearing right now, if any.
//
// Now and then, while nobody is clicking it, the PC swaps its own face for one a visitor drew and
// a speech bubble says who drew it. The face you drew yourself is in the rotation for you straight
// away, before it is approved, and only for you. This module owns that rotation. The 3D scene
// draws whatever is current and the wrapper around it draws the bubble; both just subscribe.

import { fetchFaces } from "./arcadeApi";
import type { GuestFace } from "./guestFaces";

export interface Shown {
  face: GuestFace;
  /** Drawn on this browser and not approved yet, so nobody else can see it. */
  pending: boolean;
}

const MY_FACE_KEY = "harogatos:myface";
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
  pool = [{ face, pending: true }, ...pool.filter((s) => s.face.id !== face.id)];
  next = 0;
  // harogatOS is still open over the PC when this runs. tick() waits for it to close.
  schedule(1200);
}

function schedule(delay: number) {
  clearTimeout(timer);
  timer = setTimeout(tick, delay);
}

function tick() {
  if (!pool.length) return;
  // Nobody is looking. Try again later.
  if (document.hidden) return schedule(BETWEEN_MS);
  // harogatOS is open over the page, so the PC cannot be seen. Check again shortly.
  if (document.querySelector('[aria-label="harogatOS"]')) return schedule(1500);
  show(pool[next % pool.length]);
  next++;
}

export function show(shown: Shown): void {
  set(shown);
  clearTimeout(timer);
  clearTimeout(hideTimer);
  hideTimer = setTimeout(() => {
    set(null);
    schedule(BETWEEN_MS);
  }, SHOW_MS);
}

/** Clicking the PC hands it back its own face. */
export function dismissShown(): void {
  if (!current) return;
  clearTimeout(hideTimer);
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

  // Yours goes first, and says it is waiting until it has been approved.
  pool = mine ? [{ face: mine, pending: !approvedMine }, ...shuffled.filter((s) => s.face.id !== mine.id)] : shuffled;
  if (pool.length) schedule(FIRST_DELAY_MS);
}
