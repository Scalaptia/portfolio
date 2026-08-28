// ============================================================
// 🖼️ CANVAS DRAWING UTILITIES
// ============================================================

import type { ColorScheme, FaceData, IntroFrame } from './faces'

const GRID_SIZE = 12

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
    accent?: string
): void {
    const w = ctx.canvas.width
    const h = ctx.canvas.height
    const pixelSize = w / GRID_SIZE

    // Clear with CRT background
    ctx.fillStyle = colors.bg
    ctx.fillRect(0, 0, w, h)

    // Add scanlines
    ctx.fillStyle = 'rgba(0,0,0,0.2)'
    for (let y = 0; y < h; y += 3) {
        ctx.fillRect(0, y, w, 1)
    }

    ctx.save()
    ctx.translate(w, 0)
    ctx.scale(-1, 1)

    // Blocks
    art.forEach((row, y) => {
        row.split('').forEach((char, x) => {
            const px = x * pixelSize
            const py = y * pixelSize

            if (char === '#') {
                ctx.fillStyle = colors.fg
                ctx.fillRect(px, py, pixelSize, pixelSize)
            } else if (char === '@') {
                ctx.fillStyle = accent || colors.fg
                ctx.fillRect(px, py, pixelSize, pixelSize)
            }
        })
    })

    // Words, one run at a time rather than one letter at a time, so each is sized to the space it
    // has instead of the old fixed 0.7-of-a-cell font that came out around seven pixels tall.
    ctx.fillStyle = colors.fg
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'

    art.forEach((row, y) => {
        const chars = row.split('')
        let start = -1

        const flush = (end: number) => {
            if (start < 0) return
            const word = chars.slice(start, end).join('')
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
}

// Draw a face expression
export function drawFace(ctx: CanvasRenderingContext2D, face: FaceData): void {
    drawFromArt(ctx, face.art, face.color, face.accent)
}

// Draw an intro frame
export function drawIntroFrame(ctx: CanvasRenderingContext2D, frame: IntroFrame): void {
    drawFromArt(ctx, frame.art, frame.color)
}

// Create a canvas for the face texture
export function createFaceCanvas(size: number = 128): HTMLCanvasElement {
    const canvas = document.createElement('canvas')
    canvas.width = size
    canvas.height = size
    return canvas
}
