import { Canvas, useFrame } from '@react-three/fiber'
import type { ThreeEvent } from '@react-three/fiber'
import { useGLTF, Preload } from '@react-three/drei'
import { useRef, Suspense, useState, useEffect } from 'react'
import * as THREE from 'three'

import { FACES, BLINK_FACE, DIZZY_FACE, OFF_FACE, INTRO_FRAMES, FLOPPY_READING, FLOPPY_OK, FLOPPY_STEP_MS } from './pc-model/faces'
import { playMeowSound, playPowerDownSound, playBootSound, playDriveSound } from './pc-model/sounds'
import { drawFace, createFaceCanvas, drawFromArt, drawIntroFrame } from './pc-model/drawing'
import type { Gaze } from './pc-model/drawing'

// Click it enough times in a row and it has had enough.
const RAGE_LIMIT = 8
// Clicks stop counting toward that once you leave it alone for a moment.
const RAGE_WINDOW_MS = 1500
// How far the cursor has to be from the middle of the canvas, as a fraction of its half-width,
// before the face looks that way.
const GAZE_THRESHOLD = 0.55

const gazeAxis = (v: number) => (v > GAZE_THRESHOLD ? 1 : v < -GAZE_THRESHOLD ? -1 : 0)

useGLTF.preload('/models/mac_minus.glb')

function Scene() {
    const { scene } = useGLTF('/models/mac_minus.glb', true)
    const modelRef = useRef<THREE.Group>(null)
    
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 })
    const [bounce, setBounce] = useState(0)
    const [expression, setExpression] = useState(0)
    const [isBlinking, setIsBlinking] = useState(false)
    const [isHeroHovered, setIsHeroHovered] = useState(false)
    // 'awake' is the normal state. 'dizzy' is the warning, 'off' is the shutdown, 'booting'
    // replays the intro frames that were already in the repo but never used anywhere.
    // 'incoming', 'reading' and 'read' are a floppy on its way in, in the drive, and done.
    // See FloppyDrawer.
    const [mode, setMode] = useState<'awake' | 'dizzy' | 'off' | 'booting' | 'incoming' | 'reading' | 'read'>('awake')
    const [bootFrame, setBootFrame] = useState(0)
    const [readStep, setReadStep] = useState(0)

    const rageCount = useRef(0)
    const lastClick = useRef(0)
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
            if (e.detail.hovered) {
                triggerBounce()
                playMeowSound(4)
            }
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
                    playMeowSound(1)
                    setTimeout(() => setExpression(0), 2000)
                    break
                case 'email':
                    setExpression(3)
                    playMeowSound(3)
                    setTimeout(() => setExpression(0), 1500)
                    break
            }
        }

        // A disk dropped on the PC. The drawer runs the timing and tells the PC what to show.
        const handleFloppy = (e: CustomEvent) => {
            const { phase } = e.detail
            if (phase === 'incoming') {
                // Turn square to the page so the slot is where the disk is flying to.
                setMode('incoming')
            } else if (phase === 'reading') {
                setMode('reading')
                playDriveSound()
            } else if (phase === 'done') {
                setMode('read')
            } else {
                setMode('awake')
                setExpression(0)
            }
        }

        window.addEventListener('heroHover' as any, handleHeroHover)
        window.addEventListener('pageInteraction' as any, handlePageInteraction)
        window.addEventListener('pcFloppy' as any, handleFloppy)
        
        return () => {
            window.removeEventListener('heroHover' as any, handleHeroHover)
            window.removeEventListener('pageInteraction' as any, handlePageInteraction)
            window.removeEventListener('pcFloppy' as any, handleFloppy)
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

        // Setup screen mesh
        scene.traverse((child) => {
            if (child instanceof THREE.Mesh && child.name === 'Screen_Material_0') {
                const uvAttr = child.geometry.attributes.uv
                if (uvAttr) {
                    let minU = Infinity, maxU = -Infinity
                    let minV = Infinity, maxV = -Infinity
                    
                    for (let i = 0; i < uvAttr.count; i++) {
                        minU = Math.min(minU, uvAttr.getX(i))
                        maxU = Math.max(maxU, uvAttr.getX(i))
                        minV = Math.min(minV, uvAttr.getY(i))
                        maxV = Math.max(maxV, uvAttr.getY(i))
                    }
                    
                    for (let i = 0; i < uvAttr.count; i++) {
                        uvAttr.setXY(
                            i,
                            (uvAttr.getX(i) - minU) / (maxU - minU),
                            (uvAttr.getY(i) - minV) / (maxV - minV)
                        )
                    }
                    uvAttr.needsUpdate = true
                }

                child.material = new THREE.MeshBasicMaterial({
                    map: texture,
                    side: THREE.DoubleSide
                })
            }
        })
    }, [scene])

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

        if (mode === 'incoming') {
            drawFace(ctx, FACES[6])
            textureRef.current.needsUpdate = true
            return
        }

        if (mode === 'reading' || mode === 'read') {
            drawFace(ctx, mode === 'read' ? FLOPPY_OK : FLOPPY_READING[readStep % FLOPPY_READING.length])
            textureRef.current.needsUpdate = true
            return
        }

        if (mode === 'dizzy') {
            drawFace(ctx, DIZZY_FACE)
            textureRef.current.needsUpdate = true
            return
        }

        if (isHeroHovered) {
            drawFace(ctx, FACES[4], gaze)
        } else if (isBlinking) {
            drawFromArt(ctx, BLINK_FACE.art, BLINK_FACE.color, undefined, gaze)
        } else {
            drawFace(ctx, FACES[expression % FACES.length], gaze)
        }
        textureRef.current.needsUpdate = true
    }

    useEffect(updateFace, [expression, isHeroHovered, isBlinking, mode, bootFrame, readStep, gaze.x, gaze.y])

    // The light under the disk runs while it reads.
    useEffect(() => {
        if (mode !== 'reading') return
        const t = setInterval(() => setReadStep((n) => n + 1), FLOPPY_STEP_MS)
        return () => clearInterval(t)
    }, [mode])

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
        rageCount.current = 0
        setMode('dizzy')

        scheduleRage(() => {
            setMode('off')
            playPowerDownSound()
        }, 900)

        scheduleRage(() => {
            setMode('booting')
            setBootFrame(0)
            playBootSound()

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
        // one click counted twice, and the rage shutdown came after four clicks instead of eight.
        e.stopPropagation()

        // While it is off or rebooting, poking it does nothing. That is the joke.
        if (mode !== 'awake') return

        const now = Date.now()
        rageCount.current = now - lastClick.current < RAGE_WINDOW_MS ? rageCount.current + 1 : 1
        lastClick.current = now

        if (rageCount.current >= RAGE_LIMIT) {
            triggerShutdown()
            return
        }

        triggerBounce()
        const next = (expression + 1) % FACES.length
        setExpression(next)
        playMeowSound(next)
    }

    // ANIMATION FRAME
    useFrame((state) => {
        if (!modelRef.current) return

        const frontAngle = Math.PI + 1.5

        // While it is dizzy it shakes and stops following the cursor. While it is off it slumps.
        if (mode === 'dizzy') {
            const t = state.clock.elapsedTime
            modelRef.current.rotation.y = frontAngle + Math.sin(t * 30) * 0.08
            modelRef.current.rotation.x = Math.sin(t * 22) * 0.04
            return
        }
        // Reading a disk it faces you square on and hums, the drive shaking it a hair.
        if (mode === 'incoming' || mode === 'reading' || mode === 'read') {
            const t = state.clock.elapsedTime
            const hum = mode === 'reading' ? Math.sin(t * 70) * 0.006 : 0
            modelRef.current.rotation.y += (frontAngle + hum - modelRef.current.rotation.y) * 0.2
            modelRef.current.rotation.x += (0 - modelRef.current.rotation.x) * 0.2
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

        const targetScale = 1.1 + (bounce > 0 ? Math.sin(bounce * Math.PI) * 0.15 : 0)
        const currentScale = modelRef.current.scale.x
        const newScale = currentScale + (targetScale - currentScale) * 0.15
        modelRef.current.scale.set(newScale, newScale, newScale)
    })

    return (
        <>
            <ambientLight intensity={0.5} />
            <directionalLight position={[0, 5, 5]} intensity={0.8} />
            <primitive
                ref={modelRef}
                object={scene}
                position={[0, 0, 0]}
                scale={1.1}
                rotation={[0, Math.PI + 1.5, 0]}
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
            <Canvas
                camera={{ position: [0, 0, 5], fov: 60 }}
                dpr={[1, 2]}
                performance={{ min: 0.5 }}
            >
                <Suspense fallback={null}>
                    <Scene />
                    <Preload all />
                </Suspense>
            </Canvas>
        </div>
    )
}
