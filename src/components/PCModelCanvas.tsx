import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useGLTF, Preload } from '@react-three/drei'
import { useRef, Suspense, useState, useEffect } from 'react'
import * as THREE from 'three'

import { FACES, BLINK_FACE, DIZZY_FACE, OFF_FACE, INTRO_FRAMES } from './pc-model/faces'
import { playMeowSound, playPowerDownSound, playBootSound } from './pc-model/sounds'
import { drawFace, createFaceCanvas, drawFromArt, drawIntroFrame } from './pc-model/drawing'

// Click it enough times in a row and it has had enough.
const RAGE_LIMIT = 8
// Clicks stop counting toward that once you leave it alone for a moment.
const RAGE_WINDOW_MS = 1500
// How close a lerp has to get to its target before the render loop is allowed to stop.
const SETTLED = 0.0005

useGLTF.preload('/models/mac_minus.glb')

function Scene() {
    const { scene } = useGLTF('/models/mac_minus.glb', true)
    // frameloop is 'demand', so anything that changes what the model looks like has to ask for a
    // frame. Reading gl here also avoids hunting for the canvas with a document-wide query.
    const { gl, invalidate } = useThree()
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

    const rageCount = useRef(0)
    const lastClick = useRef(0)
    const rageTimers = useRef<ReturnType<typeof setTimeout>[]>([])
    
    const canvasRef = useRef<HTMLCanvasElement | null>(null)
    const textureRef = useRef<THREE.CanvasTexture | null>(null)
    const blinkTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

    // MOUSE TRACKING
    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            const rect = gl.domElement.getBoundingClientRect()
            if (!rect.width || !rect.height) return
            const x = ((e.clientX - rect.left) / rect.width) * 2 - 1
            const y = -((e.clientY - rect.top) / rect.height) * 2 + 1
            setMousePos({ x, y })
            invalidate()
        }
        window.addEventListener('mousemove', handleMouseMove)
        return () => window.removeEventListener('mousemove', handleMouseMove)
    }, [gl, invalidate])

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
        texture.minFilter = THREE.NearestFilter
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

        if (isHeroHovered) {
            drawFace(ctx, FACES[4])
        } else if (isBlinking) {
            drawFromArt(ctx, BLINK_FACE.art, BLINK_FACE.color)
        } else {
            drawFace(ctx, FACES[expression % FACES.length])
        }
        textureRef.current.needsUpdate = true
    }

    useEffect(() => {
        updateFace()
        invalidate()
    }, [expression, isHeroHovered, isBlinking, mode, bootFrame])

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

    const handleClick = () => {
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
        const model = modelRef.current
        if (!model) return

        const frontAngle = Math.PI + 1.5

        // While it is dizzy it shakes and stops following the cursor. While it is off it slumps.
        // Both animate on their own, so both keep asking for the next frame.
        if (mode === 'dizzy') {
            const t = state.clock.elapsedTime
            model.rotation.y = frontAngle + Math.sin(t * 30) * 0.08
            model.rotation.x = Math.sin(t * 22) * 0.04
            invalidate()
            return
        }
        if (mode === 'off' || mode === 'booting') {
            model.rotation.y += (frontAngle - model.rotation.y) * 0.08
            model.rotation.x += (0.12 - model.rotation.x) * 0.08
            invalidate()
            return
        }

        const targetY = Math.atan2(mousePos.x, 1) * 0.5 + frontAngle
        // Limit vertical rotation: subtle look up/down
        const targetX = Math.max(-0.15, Math.min(0.25, -mousePos.y * 0.15))
        const targetScale = 1.1 + (bounce > 0 ? Math.sin(bounce * Math.PI) * 0.15 : 0)

        model.rotation.y += (targetY - model.rotation.y) * 0.08
        model.rotation.x += (targetX - model.rotation.x) * 0.08

        const newScale = model.scale.x + (targetScale - model.scale.x) * 0.15
        model.scale.set(newScale, newScale, newScale)

        // Under frameloop 'demand' nothing renders unless asked, so keep asking while the lerps
        // are still moving and then let the GPU go quiet.
        const settled =
            Math.abs(targetY - model.rotation.y) < SETTLED &&
            Math.abs(targetX - model.rotation.x) < SETTLED &&
            Math.abs(targetScale - model.scale.x) < SETTLED
        if (!settled) invalidate()
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
                frameloop="demand"
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
