// ============================================================
// 🖼️ CANVAS DRAWING UTILITIES
// ============================================================

import { GRID_SIZE } from './faces'
import type { ColorScheme, FaceData, IntroFrame } from './faces'

// Where the face is looking, in whole cells. Each axis is -1, 0 or 1.
export interface Gaze {
    x: number
    y: number
}

const AHEAD: Gaze = { x: 0, y: 0 }

// A face that already reaches an edge of the screen does not look that way, so nothing it draws
// gets pushed off the glass. Sleepy's Z and Excited's sparkles sit on the edges and hold still.
function clampGaze(art: string[], gaze: Gaze): Gaze {
    if (!gaze.x && !gaze.y) return gaze
    const lit = (c: string) => c === '#' || c === '@'
    const last = art.length - 1
    const touches = {
        top: art[0].split('').some(lit),
        bottom: art[last].split('').some(lit),
        left: art.some((row) => lit(row[0])),
        right: art.some((row) => lit(row[row.length - 1])),
    }
    return {
        x: (gaze.x < 0 && touches.left) || (gaze.x > 0 && touches.right) ? 0 : gaze.x,
        y: (gaze.y < 0 && touches.top) || (gaze.y > 0 && touches.bottom) ? 0 : gaze.y,
    }
}

// Draw ASCII art to canvas
//
// The whole thing is drawn mirrored because the screen mesh's UVs are flipped, so what is painted
// backwards here reads forwards on the model. Text used to be flipped back a glyph at a time, which
// un-mirrored each letter but left the columns reversed, and then drawing it upright instead just
// moved the mirroring to the model. Words are now drawn inside the same mirrored transform as the
// blocks, so the mesh undoes both the letter shapes and their order in one go.
export function drawFromArt(
    ctx: CanvasRenderingContext2D,
    art: string[],
    colors: ColorScheme,
    accent?: string,
    gaze: Gaze = AHEAD
): void {
    const w = ctx.canvas.width
    const h = ctx.canvas.height
    const pixelSize = w / (art.length || GRID_SIZE)

    // Clear with CRT background
    ctx.fillStyle = colors.bg
    ctx.fillRect(0, 0, w, h)

    ctx.save()
    ctx.translate(w, 0)
    ctx.scale(-1, 1)

    // Blocks. The whole face slides a cell toward the gaze, which reads as looking at something
    // without a separate drawing for every direction. Each block is inset by a pixel so the grid
    // shows through as a dot pitch, and glows in its own colour like lit phosphor.
    gaze = clampGaze(art, gaze)
    const inset = Math.max(1, Math.round(pixelSize / 16))
    ctx.shadowBlur = pixelSize * 0.6
    art.forEach((row, y) => {
        row.split('').forEach((char, x) => {
            if (char !== '#' && char !== '@') return
            const color = char === '@' ? accent || colors.fg : colors.fg
            ctx.fillStyle = color
            ctx.shadowColor = color
            ctx.fillRect(
                (x + gaze.x) * pixelSize + inset,
                (y + gaze.y) * pixelSize + inset,
                pixelSize - inset * 2,
                pixelSize - inset * 2
            )
        })
    })

    // Words, one run at a time rather than one letter at a time, so each is sized to the space it
    // has instead of the old fixed 0.7-of-a-cell font that came out around seven pixels tall.
    ctx.fillStyle = colors.fg
    ctx.shadowColor = colors.fg
    ctx.shadowBlur = pixelSize * 0.4
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'

    art.forEach((row, y) => {
        const chars = row.split('')
        let start = -1

        const flush = (end: number) => {
            if (start < 0) return
            // A trailing space only evens out the run so an odd-length word can be centred.
            const word = chars.slice(start, end).join('').trim()
            const runWidth = (end - start) * pixelSize
            const cx = ((start + end) / 2) * pixelSize
            const cy = (y + 0.5) * pixelSize

            let fontSize = pixelSize * 1.5
            ctx.font = `bold ${fontSize}px monospace`
            const measured = ctx.measureText(word).width
            if (measured > runWidth * 0.95) {
                fontSize *= (runWidth * 0.95) / measured
                ctx.font = `bold ${fontSize}px monospace`
            }

            ctx.fillText(word, cx, cy)
            start = -1
        }

        chars.forEach((char, x) => {
            if (char === '.' || char === '#' || char === '@') {
                flush(x)
            } else if (start < 0) {
                start = x
            }
        })
        flush(chars.length)
    })

    ctx.restore()

    // Scanlines last, so they cut across the glow as well as the blocks.
    ctx.fillStyle = 'rgba(0,0,0,0.28)'
    for (let y = 0; y < h; y += 4) {
        ctx.fillRect(0, y, w, 1)
    }
}

// Draw a face expression
export function drawFace(ctx: CanvasRenderingContext2D, face: FaceData, gaze?: Gaze): void {
    drawFromArt(ctx, face.art, face.color, face.accent, gaze)
}

// Draw an intro frame
export function drawIntroFrame(ctx: CanvasRenderingContext2D, frame: IntroFrame): void {
    drawFromArt(ctx, frame.art, frame.color, frame.accent)
}

// Create a canvas for the face texture
export function createFaceCanvas(size: number = 128): HTMLCanvasElement {
    const canvas = document.createElement('canvas')
    canvas.width = size
    canvas.height = size
    return canvas
}
