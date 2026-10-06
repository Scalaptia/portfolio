// Stacker, the rules and nothing else.
//
// A row of blocks slides back and forth. You stop it, and whatever does not sit on the row below
// falls off. The row you are left with is the width of the next one. Get to the top.
//
// This file is shared by the game in the browser and the Worker that keeps the high scores. A run
// is submitted as the tick each row was stopped at, counted from when that row started moving. The
// Worker replays those ticks through the same stopAt() the game used, which works out where the
// row was and how many times it had turned around, so the score it stores is one it worked out
// itself. Keep this module free of DOM and of Worker types for that reason.

export const COLS = 9
export const ROWS = 16
export const START_WIDTH = 3

// Score for each row that stays up, for each one that lands exactly on the row below, and for
// reaching the top at all.
export const ROW_POINTS = 100
export const PERFECT_POINTS = 50
export const TOP_BONUS = 1000
// Stopping a row decisively pays too: full speed points on its first pass, less for every time it
// turns around at a wall first. Rows speed up as you climb, so a perfect, first-pass run gets
// genuinely hard near the top, and waiting for the row to come back is no longer free.
export const SPEED_POINTS = 50
export const BOUNCE_COST = 15

export const MAX_SCORE = ROWS * (ROW_POINTS + SPEED_POINTS) + (ROWS - 1) * PERFECT_POINTS + TOP_BONUS

/** Speed points for a row that turned around this many times before it was stopped. */
export const speedPoints = (bounces: number) => Math.max(0, SPEED_POINTS - BOUNCE_COST * bounces)

/** The widest a row is allowed to be, however well you have done. Classic Stacker squeezes too. */
export function widthCap(row: number): number {
    if (row < 6) return 3
    if (row < 11) return 2
    return 1
}

/** How long the sliding row waits on each column, in milliseconds. It speeds up as you climb. */
export function tickMs(row: number): number {
    return Math.max(42, Math.round(150 - row * 7))
}

/** Rows alternate sides: even rows enter from the left heading right, odd rows the other way. */
export function startOf(row: number, width: number): { x: number; dir: 1 | -1 } {
    return row % 2 === 0 ? { x: 0, dir: 1 } : { x: COLS - width, dir: -1 }
}

/** Where a row of this width is after some number of ticks, bouncing off both walls. */
export function positionAt(row: number, width: number, ticks: number): number {
    const span = COLS - width
    if (span <= 0) return 0
    const period = span * 2
    const start = startOf(row, width)
    // Unfold the bounce into one line running left to right and back.
    const phase = start.dir === 1 ? start.x : period - start.x
    const t = (((phase + ticks) % period) + period) % period
    return t <= span ? t : period - t
}

/**
 * How many times a row has turned around after this many ticks. It enters against one wall, so the
 * first turn is when it reaches the other one and starts back. A row as wide as the field never
 * moves, so it never turns.
 */
export function bouncesAt(row: number, width: number, ticks: number): number {
    const span = COLS - width
    if (span <= 0 || ticks <= span) return 0
    return Math.floor((ticks - 1) / span)
}

export interface Placed {
    x: number
    width: number
}

export interface StackState {
    /** Rows that stayed up, bottom first. */
    stack: Placed[]
    /** Width of the row that is sliding now. */
    width: number
    score: number
    perfects: number
    /** Every turn every row made before it was stopped. Fewer breaks a tie on the board. */
    bounces: number
    over: boolean
    won: boolean
}

export function newGame(): StackState {
    return { stack: [], width: START_WIDTH, score: 0, perfects: 0, bounces: 0, over: false, won: false }
}

export interface PlaceResult {
    state: StackState
    /** The part of the row that stayed up, or null if none of it did. */
    kept: Placed | null
    /** Columns that fell off, so the game can drop them. */
    lost: number[]
    perfect: boolean
    /** Points this row added, speed included. */
    gained: number
}

/** Stop the sliding row at column x. Returns the next state; the one passed in is not changed. */
export function placeRow(state: StackState, x: number, bounces = 0): PlaceResult {
    if (state.over) return { state, kept: null, lost: [], perfect: false, gained: 0 }

    const row = state.stack.length
    const width = state.width
    const below = state.stack[row - 1]

    // The bottom row has nothing to fall off.
    const left = below ? Math.max(x, below.x) : x
    const right = below ? Math.min(x + width, below.x + below.width) : x + width
    const keptWidth = Math.max(0, right - left)

    const lost: number[] = []
    for (let c = x; c < x + width; c++) if (c < left || c >= right) lost.push(c)

    if (keptWidth === 0) {
        return { state: { ...state, over: true, bounces: state.bounces + bounces }, kept: null, lost, perfect: false, gained: 0 }
    }

    const kept = { x: left, width: keptWidth }
    const perfect = !!below && keptWidth === width
    const stack = [...state.stack, kept]
    const won = stack.length === ROWS
    const gained = ROW_POINTS + (perfect ? PERFECT_POINTS : 0) + speedPoints(bounces) + (won ? TOP_BONUS : 0)
    const score = state.score + gained

    return {
        state: {
            stack,
            width: won ? keptWidth : Math.min(keptWidth, widthCap(stack.length)),
            score,
            perfects: state.perfects + (perfect ? 1 : 0),
            bounces: state.bounces + bounces,
            over: won,
            won,
        },
        kept,
        lost,
        perfect,
        gained,
    }
}

/** Stop the sliding row this many ticks after it started moving. What the game and the Worker both call. */
export function stopAt(state: StackState, ticks: number): PlaceResult & { x: number; bounces: number } {
    const row = state.stack.length
    const x = positionAt(row, state.width, ticks)
    const bounces = bouncesAt(row, state.width, ticks)
    return { ...placeRow(state, x, bounces), x, bounces }
}

export interface Replay {
    ok: boolean
    reason?: string
    score: number
    rows: number
    won: boolean
    bounces: number
    /** How long the rows were moving in total. A real run cannot have taken less. */
    minMs: number
}

// A row left sliding this long is not a game anyone is still playing.
const MAX_TICKS = 5000

/**
 * Replay a whole run from the tick each row was stopped at. Rejects anything the game could not
 * have produced: a tick that is not a whole number, ticks after the game ended, or a run that stops
 * early without having ended.
 */
export function replay(ticks: unknown): Replay {
    const fail = (reason: string): Replay => ({ ok: false, reason, score: 0, rows: 0, won: false, bounces: 0, minMs: 0 })

    if (!Array.isArray(ticks) || ticks.length === 0 || ticks.length > ROWS) return fail('ticks')

    let state = newGame()
    let minMs = 0
    for (const tick of ticks) {
        if (state.over) return fail('after-end')
        if (!Number.isInteger(tick) || tick < 0 || tick > MAX_TICKS) return fail('tick')
        minMs += tick * tickMs(state.stack.length)
        state = stopAt(state, tick).state
    }

    if (!state.over) return fail('unfinished')
    return { ok: true, score: state.score, rows: state.stack.length, won: state.won, bounces: state.bounces, minMs }
}

// Three letters go on the board for anyone to read, so a few combinations do not.
const BLOCKED = new Set([
    // Slurs and hate, with their usual three-letter spellings.
    'FAG', 'FGT', 'NIG', 'NGR', 'NGA', 'KKK', 'KYK', 'NAZ', 'JTO', 'MRC',
    // One half of a slur that takes two rows on the board. Blocking the half that is not a word
    // on its own makes the pair impossible: NIG + GER, FAG + GOT, RET + ARD.
    'RET',
    // Explicit sexual words and harsh profanity, English and Spanish.
    'CNT', 'CUM', 'JIZ', 'DIK', 'COC', 'VAG', 'VRG', 'PTA', 'FUK', 'FUC', 'FCK',
    // "Kill yourself."
    'KYS',
])

export function cleanInitials(value: unknown): string | null {
    if (typeof value !== 'string') return null
    const initials = value.trim().toUpperCase()
    if (!/^[A-Z]{3}$/.test(initials)) return null
    return BLOCKED.has(initials) ? null : initials
}
