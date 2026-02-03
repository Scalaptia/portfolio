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
                case '.':
                    // Empty - do nothing
                    break
                default:
                    // Draw as text character - flip it back so it reads correctly
                    ctx.save()
                    ctx.translate(px + pixelSize / 2, py + pixelSize / 2)
                    ctx.scale(-1, 1) // Flip text back
                    ctx.fillStyle = colors.fg
                    ctx.font = `bold ${pixelSize * 0.7}px monospace`
                    ctx.textAlign = 'center'
                    ctx.textBaseline = 'middle'
                    ctx.fillText(char, 0, 0)
                    ctx.restore()
                    break
            }
        })
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
