// Faces drawn by visitors, the rules for what counts as one.
//
// Shared by the editor in harogatOS and the Worker that stores them, so both refuse the same
// things. Keep it free of DOM and Worker types.

export const FACE_SIZE = 16;
export const SCHEMES = ["green", "amber", "blue", "pink"] as const;
export type SchemeName = (typeof SCHEMES)[number];

export const AUTHOR_MAX = 20;
export const MESSAGE_MAX = 80;
// Fewer lit cells than this is a smudge, not a face.
export const MIN_LIT = 6;

export interface GuestFace {
  id: number;
  /** 16 rows of 16 characters: . off, # lit, @ accent. Same format as the PC's own faces. */
  art: string[];
  scheme: SchemeName;
  author: string;
  message: string;
  at: number;
}

/** Accepts 16 strings of 16, or one string of 256. Returns 16 rows, or null if it is not a face. */
export function cleanArt(value: unknown): string[] | null {
  const flat = Array.isArray(value) ? value.join("") : value;
  if (typeof flat !== "string" || flat.length !== FACE_SIZE * FACE_SIZE) return null;
  if (!/^[.#@]+$/.test(flat)) return null;

  const lit = flat.replace(/\./g, "").length;
  if (lit < MIN_LIT || lit === flat.length) return null;

  const rows: string[] = [];
  for (let r = 0; r < FACE_SIZE; r++) rows.push(flat.slice(r * FACE_SIZE, (r + 1) * FACE_SIZE));
  return rows;
}

export function cleanScheme(value: unknown): SchemeName | null {
  return SCHEMES.includes(value as SchemeName) ? (value as SchemeName) : null;
}

/** Trims, collapses whitespace and drops control characters. Null if empty when required. */
export function cleanText(value: unknown, max: number, required: boolean): string | null {
  if (typeof value !== "string") return required ? null : "";
  const text = value
    .replace(/[\u0000-\u001f\u007f-\u009f​-‏‪-‮]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (required && !text) return null;
  if ([...text].length > max) return null;
  return text;
}

export const emptyArt = () => Array.from({ length: FACE_SIZE }, () => ".".repeat(FACE_SIZE));
