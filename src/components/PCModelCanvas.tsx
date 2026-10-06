import { Canvas, useFrame } from '@react-three/fiber'
import type { ThreeEvent } from '@react-three/fiber'
import { useRef, Suspense, useState, useEffect, useMemo } from 'react'
import * as THREE from 'three'

import { buildHaroPC } from './pc-model/haroPC'

import { FACES, BLINK_FACE, DIZZY_FACE, OFF_FACE, INTRO_FRAMES, guestFace } from './pc-model/faces'
import { subscribeShown, getShown, advance, type Shown } from '@/lib/guestFaceShow'
import { play } from '@/lib/sfx'
import { drawFace, createFaceCanvas, drawFromArt, drawIntroFrame } from './pc-model/drawing'
import type { Gaze } from './pc-model/drawing'

// Spam it and it has had enough: this many clicks inside the window. That is about four a second,
// which only mashing reaches. Clicking through its faces at a normal pace never gets there.
const RAGE_LIMIT = 10
const RAGE_WINDOW_MS = 2500
// How far the cursor has to be from the middle of the canvas, as a fraction of its half-width,
// before the face looks that way.
const GAZE_THRESHOLD = 0.55

const gazeAxis = (v: number) => (v > GAZE_THRESHOLD ? 1 : v < -GAZE_THRESHOLD ? -1 : 0)

// The machine faces +Z, straight at the camera.
const FRONT = 0

function Scene() {
    const pc = useMemo(buildHaroPC, [])
    const modelRef = useRef<THREE.Group>(null)
    
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 })
    const [bounce, setBounce] = useState(0)
    const [expression, setExpression] = useState(0)
    const [isBlinking, setIsBlinking] = useState(false)
    const [isHeroHovered, setIsHeroHovered] = useState(false)
    // 'awake' is the normal state. 'dizzy' is the warning, 'off' is the shutdown, 'booting'
    // replays the intro frames that were already in the repo but never used anywhere.
    const [mode, setMode] = useState<'awake' | 'dizzy' | 'off' | 'booting'>('awake')
    const [bootFrame, setBootFrame] = useState(0)
    // A visitor's face, when a click or a pin in guestFaceShow.ts has put one up.
    const [guest, setGuest] = useState<Shown | null>(getShown)

    useEffect(() => subscribeShown(setGuest), [])

    // When the recent clicks happened, for the shutdown's sliding window.
    const rageClicks = useRef<number[]>([])
    const rageTimers = useRef<ReturnType<typeof setTimeout>[]>([])
    
    const canvasRef = useRef<HTMLCanvasElement | null>(null)
    const textureRef = useRef<THREE.CanvasTexture | null>(null)
    const blinkTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

    // MOUSE TRACKING
    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            const canvas = document.querySelector('canvas')
            if (canvas) {
                const rect = canvas.getBoundingClientRect()
                const x = ((e.clientX - rect.left) / rect.width) * 2 - 1
                const y = -((e.clientY - rect.top) / rect.height) * 2 + 1
                setMousePos({ x, y })
            }
        }
        window.addEventListener('mousemove', handleMouseMove)
        return () => window.removeEventListener('mousemove', handleMouseMove)
    }, [])

    // EASTER EGGS & INTERACTIONS
    useEffect(() => {
        const handleHeroHover = (e: CustomEvent) => {
            setIsHeroHovered(e.detail.hovered)
            // A hover is not a press, so it bounces but stays quiet.
            if (e.detail.hovered) triggerBounce()
        }

        const handlePageInteraction = (e: CustomEvent) => {
            const { type, hovered } = e.detail
            
            switch (type) {
                case 'project':
                    if (hovered) {
                        setExpression(2) // Surprised when hovering
                    } else {
                        setTimeout(() => setExpression(0), 300) // Back to normal after leaving
                    }
                    break
                case 'social':
                    triggerBounce()
                    setExpression(1)
                    setTimeout(() => setExpression(0), 2000)
                    break
                case 'email':
                    setExpression(3)
                    setTimeout(() => setExpression(0), 1500)
                    break
            }
        }

        window.addEventListener('heroHover' as any, handleHeroHover)
        window.addEventListener('pageInteraction' as any, handlePageInteraction)
        
        return () => {
            window.removeEventListener('heroHover' as any, handleHeroHover)
            window.removeEventListener('pageInteraction' as any, handlePageInteraction)
        }
    }, [])

    // TEXTURE INITIALIZATION
    useEffect(() => {
        if (canvasRef.current) return
        
        // 256 rather than 128: the block art looks the same under NearestFilter, but words in
        // the boot frames get twice the pixels and stop reading as smudges.
        canvasRef.current = createFaceCanvas(256)
        const ctx = canvasRef.current.getContext('2d')
        if (!ctx) return

        // Draw initial face
        drawFace(ctx, FACES[0])
        
        const texture = new THREE.CanvasTexture(canvasRef.current)
        // The screen is drawn smaller than the texture, so it is minified. Nearest there sampled
        // the scanlines unevenly and drew a moire swirl across the glass. Mipmaps average them
        // into an even dimming instead. Magnified, it stays nearest and keeps hard pixel edges.
        texture.minFilter = THREE.LinearMipmapLinearFilter
        texture.generateMipmaps = true
        texture.anisotropy = 4
        texture.magFilter = THREE.NearestFilter
        texture.flipY = false
        textureRef.current = texture

        // The glass shows the face canvas, unlit and untouched by tone mapping, so the phosphor
        // colours come out as drawn.
        pc.screen.material = new THREE.MeshBasicMaterial({ map: texture, toneMapped: false })
    }, [pc])

    // Rows run downward, so a cursor above the canvas is a negative row offset.
    const gaze: Gaze = { x: gazeAxis(mousePos.x), y: -gazeAxis(mousePos.y) }

    // FACE UPDATES
    const updateFace = () => {
        if (!canvasRef.current || !textureRef.current) return
        const ctx = canvasRef.current.getContext('2d')
        if (!ctx) return

        if (mode === 'off') {
            drawFace(ctx, OFF_FACE)
            textureRef.current.needsUpdate = true
            return
        }

        if (mode === 'booting') {
            drawIntroFrame(ctx, INTRO_FRAMES[Math.min(bootFrame, INTRO_FRAMES.length - 1)])
            textureRef.current.needsUpdate = true
            return
        }

        if (mode === 'dizzy') {
            drawFace(ctx, DIZZY_FACE)
            textureRef.current.needsUpdate = true
            return
        }

        // A pinned face stays on through hovers until the PC is clicked.
        if (guest?.pinned) {
            drawFace(ctx, guestFace(guest.face.art, guest.face.scheme), gaze)
        } else if (isHeroHovered) {
            drawFace(ctx, FACES[4], gaze)
        } else if (guest) {
            drawFace(ctx, guestFace(guest.face.art, guest.face.scheme), gaze)
        } else if (isBlinking) {
            drawFromArt(ctx, BLINK_FACE.art, BLINK_FACE.color, undefined, gaze)
        } else {
            drawFace(ctx, FACES[expression % FACES.length], gaze)
        }
        textureRef.current.needsUpdate = true
    }

    useEffect(updateFace, [expression, isHeroHovered, isBlinking, mode, bootFrame, gaze.x, gaze.y, guest])

    // RAGE-CLICK SHUTDOWN
    const clearRageTimers = () => {
        rageTimers.current.forEach(clearTimeout)
        rageTimers.current = []
    }

    useEffect(() => clearRageTimers, [])

    const scheduleRage = (fn: () => void, delay: number) => {
        rageTimers.current.push(setTimeout(fn, delay))
    }

    const triggerShutdown = () => {
        clearRageTimers()
        rageClicks.current = []
        setMode('dizzy')

        scheduleRage(() => {
            setMode('off')
            // The power button, then the tube going dark.
            play('pc-button')
            play('crt-off', { delay: 0.12 })
        }, 900)

        scheduleRage(() => {
            setMode('booting')
            setBootFrame(0)
            // The monitor's switch, then the self-test beep.
            play('crt-on')
            play('pc-beep', { delay: 0.45 })

            let elapsed = 0
            INTRO_FRAMES.forEach((frame, i) => {
                if (i === 0) return
                elapsed += INTRO_FRAMES[i - 1].duration
                scheduleRage(() => setBootFrame(i), elapsed)
            })
            const total = INTRO_FRAMES.reduce((sum, f) => sum + f.duration, 0)
            scheduleRage(() => {
                setMode('awake')
                setExpression(0)
            }, total)
        }, 2600)
    }

    // BLINK ANIMATION
    useEffect(() => {
        const scheduleBlink = () => {
            const delay = 3000 + Math.random() * 5000
            blinkTimer.current = setTimeout(() => {
                if (expression === 0 && !isHeroHovered && mode === 'awake') {
                    setIsBlinking(true)
                    setTimeout(() => setIsBlinking(false), 120)
                }
                scheduleBlink()
            }, delay)
        }

        scheduleBlink()
        return () => {
            if (blinkTimer.current) clearTimeout(blinkTimer.current)
        }
    }, [isHeroHovered, expression, mode])

    // INTERACTION
    const triggerBounce = () => {
        setBounce(1)
        setTimeout(() => setBounce(0), 300)
    }

    const handleClick = (e: ThreeEvent<MouseEvent>) => {
        // Pointer events reach every mesh under the cursor, screen and case alike. Without this
        // one click counted twice, and the rage shutdown came at half the clicks it should.
        e.stopPropagation()

        // While it is off or rebooting, poking it does nothing. That is the joke.
        if (mode !== 'awake') return

        const now = Date.now()
        rageClicks.current = [...rageClicks.current.filter((t) => now - t < RAGE_WINDOW_MS), now]

        if (rageClicks.current.length >= RAGE_LIMIT) {
            triggerShutdown()
            return
        }

        triggerBounce()
        // Every third click is a visitor's face (see guestFaceShow.ts). The rest step through the
        // PC's own expressions.
        if (advance()) {
            // The PC speaker's bip-bip: the same beep, the second a fifth higher.
            play('pc-guest')
            play('pc-guest', { delay: 0.085, rate: 1.5 })
            return
        }
        const next = (expression + 1) % FACES.length
        setExpression(next)
        // The same bip each time, a hair higher or lower, so fast clicks do not sound like a machine gun.
        play('pc-click', { rate: 0.94 + Math.random() * 0.12 })
    }

    // ANIMATION FRAME
    useFrame((state) => {
        if (!modelRef.current) return

        const frontAngle = FRONT
        // The power light goes dark with the machine.
        pc.led.color.set(mode === 'off' ? '#5a4a3a' : '#FD8D75')

        // While it is dizzy it shakes and stops following the cursor. While it is off it slumps.
        if (mode === 'dizzy') {
            const t = state.clock.elapsedTime
            modelRef.current.rotation.y = frontAngle + Math.sin(t * 30) * 0.08
            modelRef.current.rotation.x = Math.sin(t * 22) * 0.04
            return
        }
        if (mode === 'off' || mode === 'booting') {
            modelRef.current.rotation.y += (frontAngle - modelRef.current.rotation.y) * 0.08
            modelRef.current.rotation.x += (0.12 - modelRef.current.rotation.x) * 0.08
            return
        }

        const targetY = Math.atan2(mousePos.x, 1) * 0.5 + frontAngle
        // Limit vertical rotation: subtle look up/down
        const targetX = Math.max(-0.15, Math.min(0.25, -mousePos.y * 0.15))

        modelRef.current.rotation.y += (targetY - modelRef.current.rotation.y) * 0.08
        modelRef.current.rotation.x += (targetX - modelRef.current.rotation.x) * 0.08

        const targetScale = 1.22 + (bounce > 0 ? Math.sin(bounce * Math.PI) * 0.15 : 0)
        const currentScale = modelRef.current.scale.x
        const newScale = currentScale + (targetScale - currentScale) * 0.15
        modelRef.current.scale.set(newScale, newScale, newScale)
    })

    return (
        <>
            {/* Light from the upper left, like the hard shadows on the page fall down and right.
                Lambert divides by pi, so a lit face gets ambient + direct = pi and shows its paint
                colour exactly. A face turned away drops to the 90/255 step, about three quarters. */}
            <ambientLight intensity={1.93} />
            <directionalLight position={[-3, 5, 5]} intensity={1.21} />
            <primitive
                ref={modelRef}
                object={pc.group}
                position={[0, 0, 0]}
                scale={1.22}
                rotation={[0, FRONT, 0]}
                onClick={handleClick}
                onPointerOver={() => document.body.style.cursor = 'pointer'}
                onPointerOut={() => document.body.style.cursor = 'default'}
                dispose={null}
            />
        </>
    )
}

export default function PCModelCanvas() {
    return (
        <div className="w-full h-full">
            {/* flat: no filmic tone mapping. The machine is painted in the site's own colours
                and they should come out as those colours, not a greyed film look. */}
            <Canvas
                flat
                camera={{ position: [0, 0, 5], fov: 60 }}
                dpr={[1, 2]}
                performance={{ min: 0.5 }}
            >
                <Suspense fallback={null}>
                    <Scene />
                </Suspense>
            </Canvas>
        </div>
    )
}
