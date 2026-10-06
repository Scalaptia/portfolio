// The site's sound effects, small WAVs in public/sfx. HARO-PC and its screen are real hardware
// recordings (sfx/RECORDINGS.md). The games on its screen are retro sounds made with rFXGen
// (sfx/sounds.txt). This plays them: one shared AudioContext, each file fetched and decoded
// once, the first time it is wanted.
//
// Nothing plays until the visitor has done something, which is also when browsers let audio start.

export type Sfx =
  | "pc-click"
  | "pc-guest"
  | "pc-confirm"
  | "pc-insert"
  | "pc-button"
  | "pc-beep"
  | "pc-seek"
  | "crt-on"
  | "crt-off"
  | "case-button"
  | "stk-start"
  | "stk-place"
  | "stk-perfect"
  | "stk-chop"
  | "stk-over"
  | "stk-win"
  | "ui-key"
  | "ui-pen"
  | "ui-erase"
  | "face-sent";

interface Options {
  /** Playback speed. 2 is an octave up, 2 ** (1 / 12) a semitone. */
  rate?: number;
  /** Seconds from now. */
  delay?: number;
  volume?: number;
}

let context: AudioContext | null = null;
const buffers = new Map<Sfx, Promise<AudioBuffer | null>>();

function audio(): AudioContext | null {
  if (typeof window === "undefined") return null;
  try {
    context ??= new AudioContext();
    if (context.state === "suspended") void context.resume();
    return context;
  } catch {
    return null;
  }
}

function load(ctx: AudioContext, name: Sfx): Promise<AudioBuffer | null> {
  let buffer = buffers.get(name);
  if (!buffer) {
    buffer = fetch(`/sfx/${name}.wav`)
      .then((res) => (res.ok ? res.arrayBuffer() : Promise.reject(res.status)))
      .then((data) => ctx.decodeAudioData(data))
      .catch(() => {
        buffers.delete(name);
        return null;
      });
    buffers.set(name, buffer);
  }
  return buffer;
}

export function play(name: Sfx, { rate = 1, delay = 0, volume = 1 }: Options = {}): void {
  const ctx = audio();
  if (!ctx) return;
  void load(ctx, name).then((buffer) => {
    if (!buffer) return;
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.playbackRate.value = rate;
    const gain = ctx.createGain();
    gain.gain.value = volume;
    source.connect(gain).connect(ctx.destination);
    source.start(ctx.currentTime + delay);
    source.onended = () => {
      source.disconnect();
      gain.disconnect();
    };
  });
}

/** Fetch sounds ahead of time, so the first press of something is not silent while it loads. */
export function preload(...names: Sfx[]): void {
  const ctx = audio();
  if (ctx) names.forEach((name) => void load(ctx, name));
}

/** n semitones up from the sound as recorded. */
export const semitones = (n: number) => 2 ** (n / 12);
