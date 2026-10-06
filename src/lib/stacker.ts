// Stacker, the rules and nothing else.
//
// A row of blocks slides back and forth. You stop it, and whatever does not sit on the row below
// falls off. The row you are left with is the width of the next one. Get to the top.
//
// This file is shared by the game in the browser and the Worker that keeps the high scores. A run
// is submitted as the column each row was stopped at, and the Worker replays those columns through
// the same placeRow() the game used, so the score it stores is one it worked out itself. Keep this
// module free of DOM and of Worker types for that reason.

export const COLS = 9
export const ROWS = 16
export const START_WIDTH = 3

// Score for each row that stays up, for each one that lands exactly on the row below, and for
// reaching the top at all.
export const ROW_POINTS = 100
export const PERFECT_POINTS = 50
export const TOP_BONUS = 1000

export const MAX_SCORE = ROWS * ROW_POINTS + (ROWS - 1) * PERFECT_POINTS + TOP_BONUS

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
    over: boolean
    won: boolean
}

export function newGame(): StackState {
    return { stack: [], width: START_WIDTH, score: 0, perfects: 0, over: false, won: false }
}

export interface PlaceResult {
    state: StackState
    /** The part of the row that stayed up, or null if none of it did. */
    kept: Placed | null
    /** Columns that fell off, so the game can drop them. */
    lost: number[]
    perfect: boolean
}

/** Stop the sliding row at column x. Returns the next state; the one passed in is not changed. */
export function placeRow(state: StackState, x: number): PlaceResult {
    if (state.over) return { state, kept: null, lost: [], perfect: false }

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
        return { state: { ...state, over: true }, kept: null, lost, perfect: false }
    }

    const kept = { x: left, width: keptWidth }
    const perfect = !!below && keptWidth === width
    const stack = [...state.stack, kept]
    const won = stack.length === ROWS
    const score =
        state.score + ROW_POINTS + (perfect ? PERFECT_POINTS : 0) + (won ? TOP_BONUS : 0)

    return {
        state: {
            stack,
            width: won ? keptWidth : Math.min(keptWidth, widthCap(stack.length)),
            score,
            perfects: state.perfects + (perfect ? 1 : 0),
            over: won,
            won,
        },
        kept,
        lost,
        perfect,
    }
}

export interface Replay {
    ok: boolean
    reason?: string
    score: number
    rows: number
    won: boolean
    /** The least time a person could have taken to stop every row where it was stopped. */
    minMs: number
}

/**
 * Replay a whole run from the column each row was stopped at. Rejects anything the game could not
 * have produced: a column the sliding row never reaches, moves after the game ended, or a run that
 * stops early without having ended.
 */
export function replay(moves: unknown): Replay {
    const fail = (reason: string): Replay => ({ ok: false, reason, score: 0, rows: 0, won: false, minMs: 0 })

    if (!Array.isArray(moves) || moves.length === 0 || moves.length > ROWS) return fail('moves')

    let state = newGame()
    let minMs = 0
    for (let i = 0; i < moves.length; i++) {
        const x = moves[i]
        if (state.over) return fail('after-end')
        if (!Number.isInteger(x) || x < 0 || x > COLS - state.width) return fail('column')

        // Ticks until the row first reaches x from where it enters.
        const row = state.stack.length
        const start = startOf(row, state.width)
        const ticks = start.dir === 1 ? x - start.x : start.x - x
        minMs += ticks * tickMs(row)

        state = placeRow(state, x).state
    }

    if (!state.over) return fail('unfinished')
    return { ok: true, score: state.score, rows: state.stack.length, won: state.won, minMs }
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
