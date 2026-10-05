// Which visitor's face the PC is wearing right now, if any.
//
// Now and then, while nobody is clicking it, the PC swaps its own face for one a visitor drew and
// a speech bubble says who drew it. A face can also be pinned: the one you just drew, or one you
// picked in the gallery with SHOW ON PC. A pinned face stays on, through page changes and reloads
// for the rest of the session, until you click the PC. Then the rotation picks up again. This
// module owns all of that. The 3D scene draws whatever is current and the wrapper around it draws
// the bubble; both just subscribe.

import { fetchFaces } from "./arcadeApi";
import type { GuestFace } from "./guestFaces";

export interface Shown {
  face: GuestFace;
  /** Drawn on this browser and not approved yet, so nobody else can see it. */
  pending: boolean;
  /** Stays on until the PC is clicked. */
  pinned?: boolean;
  /** Whether the speech bubble is up. A pinned face stays on after its bubble goes. */
  bubble?: boolean;
}

const MY_FACE_KEY = "harogatos:myface";
// Session storage, so a pin ends with the tab and the next visit is back to rotating.
const PIN_KEY = "harogatos:pin";
const FIRST_DELAY_MS = 9_000;
const BETWEEN_MS = 20_000;
const SHOW_MS = 7_000;

let current: Shown | null = null;
let pin: Shown | null = null;
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

function savePin(shown: Shown | null) {
  try {
    if (shown) sessionStorage.setItem(PIN_KEY, JSON.stringify({ face: shown.face, pending: shown.pending }));
    else sessionStorage.removeItem(PIN_KEY);
  } catch {
    // Pinned until the page reloads instead of until the tab closes.
  }
}

function loadPin(): Shown | null {
  try {
    const raw = JSON.parse(sessionStorage.getItem(PIN_KEY) ?? "null");
    if (raw?.face && Array.isArray(raw.face.art)) return { face: raw.face, pending: !!raw.pending, pinned: true };
  } catch {
    // A broken pin is no pin.
  }
  return null;
}

function pinFace(shown: Shown) {
  pin = { ...shown, pinned: true };
  savePin(pin);
  clearTimeout(hideTimer);
  // harogatOS is still open over the PC when this runs. tick() waits for it to close.
  schedule(600);
}

/** You just drew this. It goes on your PC, and into your rotation for later. */
export function rememberMyFace(face: GuestFace): void {
  try {
    localStorage.setItem(MY_FACE_KEY, JSON.stringify(face));
  } catch {
    // Not remembered across visits. It still shows this time.
  }
  pool = [{ face, pending: true }, ...pool.filter((s) => s.face.id !== face.id)];
  next = 0;
  pinFace({ face, pending: true });
}

/** SHOW ON PC in the gallery. The gallery only lists approved faces, so it is never pending. */
export function wearFace(face: GuestFace): void {
  pinFace({ face, pending: false });
}

function schedule(delay: number) {
  clearTimeout(timer);
  timer = setTimeout(tick, delay);
}

function tick() {
  // A pinned face is on for good. Show it, and stop rotating.
  if (pin && current?.face.id === pin.face.id && current.bubble === false) return;
  if (!pin && !pool.length) return;
  // Nobody is looking. Try again later.
  if (document.hidden) return schedule(pin ? 1500 : BETWEEN_MS);
  // harogatOS is open over the page, so the PC cannot be seen. Check again shortly.
  if (document.querySelector('[aria-label="harogatOS"]')) return schedule(1500);
  if (pin) return show(pin);
  show(pool[next % pool.length]);
  next++;
}

function show(shown: Shown): void {
  set({ ...shown, bubble: true });
  clearTimeout(timer);
  clearTimeout(hideTimer);
  hideTimer = setTimeout(() => {
    if (shown.pinned) return set({ ...shown, bubble: false });
    set(null);
    schedule(BETWEEN_MS);
  }, SHOW_MS);
}

/** Clicking the PC hands it back its own face, pinned or not, and the rotation starts over. */
export function dismissShown(): void {
  if (!current && !pin) return;
  clearTimeout(hideTimer);
  if (pin) {
    pin = null;
    savePin(null);
  }
  set(null);
  schedule(BETWEEN_MS);
}

export async function startRotation(): Promise<void> {
  if (started) return;
  started = true;

  // Pinned earlier in this session. Back on straight away, before the gallery has even loaded.
  pin = loadPin();
  if (pin) schedule(0);

  const mine = myFace();
  const approved = (await fetchFaces()) ?? [];
  const approvedMine = !!mine && approved.some((f) => f.id === mine.id);
  if (pin && approvedMine && pin.face.id === mine?.id) pin = { ...pin, pending: false };

  const shuffled = approved
    .filter((f) => f.art.length)
    .map((face) => ({ face, pending: false, sort: Math.random() }))
    .sort((a, b) => a.sort - b.sort)
    .map(({ face, pending }) => ({ face, pending }));

  // Yours goes first, and says it is waiting until it has been approved.
  pool = mine
    ? [{ face: mine, pending: !approvedMine }, ...shuffled.filter((s) => s.face.id !== mine.id)]
    : shuffled;
  if (!pin && pool.length) schedule(FIRST_DELAY_MS);
}
