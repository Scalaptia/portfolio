// ============================================================
// 🖼️ CANVAS DRAWING UTILITIES
// ============================================================

import type { ColorScheme, FaceData, IntroFrame } from './faces'

const GRID_SIZE = 12

// Draw ASCII art to canvas
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

    // Flip canvas horizontally for correct orientation
    ctx.save()
    ctx.translate(w, 0)
    ctx.scale(-1, 1)

    // Draw pixels
    art.forEach((row, y) => {
        row.split('').forEach((char, x) => {
            const px = x * pixelSize
            const py = y * pixelSize

            switch (char) {
                case '#':
                    ctx.fillStyle = colors.fg
                    ctx.fillRect(px, py, pixelSize, pixelSize)
                    break
                case '@':
                    ctx.fillStyle = accent || colors.fg
                    ctx.fillRect(px, py, pixelSize, pixelSize)
                    break
                case 'O':
                    // Hollow effect - draw foreground then cut out center
                    ctx.fillStyle = colors.fg
                    ctx.fillRect(px, py, pixelSize, pixelSize)
                    ctx.fillStyle = colors.bg
                    ctx.fillRect(px + 2, py + 2, pixelSize - 4, pixelSize - 4)
                    break
                default:
                    // Anything that is not a block is text, and text is handled below in one
                    // pass per word rather than per character.
                    break
            }
        })
    })

    ctx.restore()

    // Text runs, drawn outside the mirrored transform.
    //
    // The block pass above runs mirrored so the art lines up with the screen mesh UVs. Characters
    // used to be drawn inside that transform and flipped back one at a time, which fixed each
    // glyph but left the columns in reverse order, so FERNANDO came out as ODNANREF. Drawing a
    // whole word here, at the mirrored position, keeps the order and the orientation. Sizing per
    // run also gets the type off the old 0.7-cell font, which was about seven pixels and turned
    // into mush once the texture hit the model.
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
            // Mirror the run's centre back into screen space.
            const cx = w - ((start + end) / 2) * pixelSize
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
            if (char === '.' || char === '#' || char === '@' || char === 'O') {
                flush(x)
            } else if (start < 0) {
                start = x
            }
        })
        flush(chars.length)
    })
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
