// Which visitor's face the PC is wearing right now, if any.
//
// Clicking the PC steps it to its next face. Every third click is a face a visitor drew, with a
// speech bubble saying who drew it, taken in turn from the approved ones. The other clicks are the
// PC's own expressions. Nothing changes on a timer: the face on the PC is whatever the last click
// left there.
//
// A face can also be pinned: the one you just drew, or one you picked in the gallery with SHOW ON
// PC. A pinned face goes up straight away and stays, through page changes and reloads for the rest
// of the session. The next click carries on from there.
//
// This module owns the visitor faces. The 3D scene draws whatever is current and the wrapper
// around it draws the bubble; both just subscribe.

import { fetchFaces } from "./arcadeApi";
import type { GuestFace } from "./guestFaces";

export interface Shown {
  face: GuestFace;
  /** Drawn on this browser and not approved yet, so nobody else can see it. */
  pending: boolean;
  /** Stays on until the PC is clicked. */
  pinned?: boolean;
  /** Whether the speech bubble is up. The face stays on after its bubble goes. */
  bubble?: boolean;
}

const MY_FACE_KEY = "harogatos:myface";
// Session storage, so a pin ends with the tab and the next visit starts on the PC's own face.
const PIN_KEY = "harogatos:pin";
// How long the bubble stays up. The face itself stays until the next click.
const BUBBLE_MS = 7_000;
// Every this many clicks, a visitor's face instead of one of the PC's own.
const EVERY = 3;

let current: Shown | null = null;
let pin: Shown | null = null;
const listeners = new Set<(shown: Shown | null) => void>();
let deck: Shown[] = [];
let nextGuest = 0;
let clicks = 0;
let timer: ReturnType<typeof setTimeout> | undefined;
let bubbleTimer: ReturnType<typeof setTimeout> | undefined;
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

function show(shown: Shown) {
  set({ ...shown, bubble: true });
  clearTimeout(bubbleTimer);
  bubbleTimer = setTimeout(() => {
    if (current?.face.id === shown.face.id) set({ ...current, bubble: false });
  }, BUBBLE_MS);
}

// A pin goes up once harogatOS has closed, so the PC is in view when it changes.
function showPinWhenVisible() {
  clearTimeout(timer);
  if (!pin) return;
  if (document.hidden || document.querySelector('[aria-label="harogatOS"]')) {
    timer = setTimeout(showPinWhenVisible, 500);
    return;
  }
  show(pin);
}

function pinFace(shown: Shown) {
  pin = { ...shown, pinned: true };
  savePin(pin);
  showPinWhenVisible();
}

/** You just drew this. It goes on your PC now, and into the deck for later clicks. */
export function rememberMyFace(face: GuestFace): void {
  try {
    localStorage.setItem(MY_FACE_KEY, JSON.stringify(face));
  } catch {
    // Not remembered across visits. It still shows this time.
  }
  deck = [{ face, pending: true }, ...deck.filter((s) => s.face.id !== face.id)];
  nextGuest = 1;
  pinFace({ face, pending: true });
}

/** SHOW ON PC in the gallery. The gallery only lists approved faces, so it is never pending. */
export function wearFace(face: GuestFace): void {
  pinFace({ face, pending: false });
}

/**
 * The PC was clicked. Unpins whatever was pinned, then puts up the next visitor face if it is
 * that click's turn. Returns true when a visitor face went up, false when the PC should show its
 * own next expression.
 */
export function advance(): boolean {
  if (pin) {
    pin = null;
    savePin(null);
  }
  clicks++;
  if (deck.length && clicks % EVERY === 0) {
    show(deck[nextGuest % deck.length]);
    nextGuest++;
    return true;
  }
  clearTimeout(bubbleTimer);
  if (current) set(null);
  return false;
}

export async function startRotation(): Promise<void> {
  if (started) return;
  started = true;

  // Pinned earlier in this session. Back on straight away, before the faces have even loaded.
  pin = loadPin();
  if (pin) showPinWhenVisible();

  const mine = myFace();
  const approved = (await fetchFaces()) ?? [];
  const approvedMine = !!mine && approved.some((f) => f.id === mine.id);
  if (pin && approvedMine && pin.face.id === mine?.id) pin = { ...pin, pending: false };

  const shuffled = approved
    .filter((f) => f.art.length)
    .map((face) => ({ face, pending: false, sort: Math.random() }))
    .sort((a, b) => a.sort - b.sort)
    .map(({ face, pending }) => ({ face, pending }));

  // Yours comes up first, and says it is waiting until it has been approved.
  deck = mine
    ? [{ face: mine, pending: !approvedMine }, ...shuffled.filter((s) => s.face.id !== mine.id)]
    : shuffled;
}
