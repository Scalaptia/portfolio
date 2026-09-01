import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useGLTF, Preload } from '@react-three/drei'
import { useRef, Suspense, useState, useEffect, type RefObject } from 'react'
import * as THREE from 'three'

import { FACES, BLINK_FACE, DIZZY_FACE, OFF_FACE, INTRO_FRAMES, CRT_COLORS } from './pc-model/faces'
import { playMeowSound, playPowerDownSound, playBootSound } from './pc-model/sounds'
import { drawFace, createFaceCanvas, drawFromArt, drawIntroFrame } from './pc-model/drawing'
import { createScreenMaterial, preparePhotoTexture } from './pc-model/screenMaterial'
import { getViewerState, subscribe as subscribeViewer, type ViewerState } from '@/lib/crtViewer'

// Click it enough times in a row and it has had enough.
const RAGE_LIMIT = 8
// Clicks stop counting toward that once you leave it alone for a moment.
const RAGE_WINDOW_MS = 1500
// How close a lerp has to get to its target before the render loop is allowed to stop.
const SETTLED = 0.0005
// The heading at which the model faces the camera.
const FRONT_ANGLE = Math.PI + 1.5
const HERO_SCALE = 1.1
// Below this width the model stays in the hero rather than following you down the page.
const DESKTOP_WIDTH = 1024
const CORNER_AFTER = 400
const CORNER_INSET = 32
const CORNER_SIZE = 200
// How much of the window's short side the screen fills once it is showing a picture.
const VIEWER_FILL = 0.72
// ...but never blow the case up past this much of the window, or the machine stops reading as a
// machine. Height is the strict one, since the chin and the feet are what say "computer". Sideways
// there is more slack, so a narrow phone gets a usefully bigger picture for a little cropped case.
const VIEWER_MAX_HEIGHT = 1.0
const VIEWER_MAX_WIDTH = 1.25
// Hero to corner is a short hop. Flying into a picture takes longer and should be felt.
const MOVE_MS = 320
const FLY_MS = 620

type Spot = 'hero' | 'corner' | 'viewer'

interface Placement {
    /** Centre of the model, in CSS pixels from the left of the window. */
    x: number
    /** Centre of the model, in CSS pixels from the top of the window. */
    y: number
    /** How tall the model should look on screen, in CSS pixels. */
    size: number
}

interface Measurements {
    /** Height of the whole model at scale 1, in world units. */
    modelHeight: number
    /** Width of the model in the pose it holds, so the framing can fit narrow windows. */
    modelWidth: number
    /** Height of the screen alone at scale 1, so a photo is sized by the glass, not the case. */
    screenHeight: number
    /** Middle of the screen in the model's own space, for centring the picture not the case. */
    screenCentre: THREE.Vector3
}

const easeInOut = (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2)
const lerp = (a: number, b: number, t: number) => a + (b - a) * t

function restingSpot(): Spot {
    if (!document.getElementById('pc-hero-anchor')) return 'corner'
    if (window.innerWidth < DESKTOP_WIDTH) return 'hero'
    return window.scrollY > CORNER_AFTER ? 'corner' : 'hero'
}

useGLTF.preload('/models/mac_minus.glb')

function Scene({ hitRef }: { hitRef: RefObject<HTMLDivElement> }) {
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
    const [viewer, setViewer] = useState<ViewerState>(() => getViewerState())

    const rageCount = useRef(0)
    const lastClick = useRef(0)
    const rageTimers = useRef<ReturnType<typeof setTimeout>[]>([])

    const canvasRef = useRef<HTMLCanvasElement | null>(null)
    const textureRef = useRef<THREE.CanvasTexture | null>(null)
    const materialRef = useRef<THREE.ShaderMaterial | null>(null)
    const photoRef = useRef<THREE.Texture | null>(null)
    const blinkTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
    const measured = useRef<Measurements | null>(null)

    // Where the model is now, where it came from, and how far along it is.
    const here = useRef<Placement>({ x: 0, y: 0, size: 0 })
    const from = useRef<Placement>({ x: 0, y: 0, size: 0 })
    const spot = useRef<Spot>('corner')
    const fromSpot = useRef<Spot>('corner')
    const tween = useRef(1)
    const settled = useRef(true)

    // MOUSE TRACKING
    // The canvas is the whole window, so the cursor is measured against the model's own box
    // instead. That keeps the old feel: it looks straight at you when you are over it.
    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            const box = here.current
            if (!box.size) return
            const half = box.size / 2
            setMousePos({
                x: (e.clientX - box.x) / half,
                y: -(e.clientY - box.y) / half,
            })
            invalidate()
        }
        window.addEventListener('mousemove', handleMouseMove)
        return () => window.removeEventListener('mousemove', handleMouseMove)
    }, [invalidate])

    // WHERE THE MODEL SHOULD BE
    const moveTo = (next: Spot) => {
        if (spot.current === next) return
        from.current = { ...here.current }
        fromSpot.current = spot.current
        spot.current = next
        tween.current = 0
        invalidate()
    }

    useEffect(() => {
        const settle = () => {
            if (spot.current !== 'viewer') moveTo(restingSpot())
            invalidate()
        }
        window.addEventListener('scroll', settle, { passive: true })
        window.addEventListener('resize', settle)
        document.addEventListener('astro:page-load', settle)
        return () => {
            window.removeEventListener('scroll', settle)
            window.removeEventListener('resize', settle)
            document.removeEventListener('astro:page-load', settle)
        }
    }, [invalidate])

    // THE VIEWER
    useEffect(() => {
        return subscribeViewer((next) => {
            const wasShowing = spot.current === 'viewer'
            const showing = next.open && next.mode === 'crt'
            setViewer(next)

            if (showing && !wasShowing) {
                settled.current = false
                moveTo('viewer')
                playPowerDownSound()
            } else if (!showing && wasShowing) {
                moveTo(restingSpot())
                playBootSound()
            }
            invalidate()
        })
    }, [invalidate])

    // The picture itself. One texture at a time, disposed as soon as it is replaced, because a
    // long session would otherwise hold every full-size image it ever showed.
    useEffect(() => {
        if (!viewer.open || viewer.mode !== 'crt') return
        const item = viewer.items[viewer.index]
        if (!item) return

        let cancelled = false
        const loader = new THREE.TextureLoader()
        loader.load(
            item.lightboxSrc || item.src,
            (texture) => {
                if (cancelled) {
                    texture.dispose()
                    return
                }
                preparePhotoTexture(texture, gl.capabilities.getMaxAnisotropy())
                const material = materialRef.current
                if (!material) return
                photoRef.current?.dispose()
                photoRef.current = texture
                material.uniforms.uPhoto.value = texture
                const image = texture.image as { width: number; height: number }
                material.uniforms.uPhotoAspect.value = image.width / image.height
                material.uniforms.uBg.value = new THREE.Color(CRT_COLORS[viewer.scheme].bg)
                invalidate()
            },
            undefined,
            () => {
                // Nothing to put on the glass, so hand the set back to the plain lightbox.
                window.dispatchEvent(new CustomEvent('crtViewerFailed'))
            }
        )

        return () => {
            cancelled = true
        }
    }, [viewer.open, viewer.mode, viewer.index, viewer.items, viewer.scheme, gl, invalidate])

    useEffect(() => {
        return () => {
            photoRef.current?.dispose()
            photoRef.current = null
        }
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

                const material = createScreenMaterial(texture)
                child.material = material
                materialRef.current = material
            }
        })

        // Measure the model unrotated and at scale 1, so the placement maths never depends on
        // whatever pose it happens to be holding.
        const screen = scene.getObjectByName('Screen_Material_0')
        const pose = {
            scale: scene.scale.clone(),
            rotation: scene.rotation.clone(),
            position: scene.position.clone(),
        }
        scene.scale.set(1, 1, 1)
        scene.rotation.set(0, 0, 0)
        scene.position.set(0, 0, 0)
        scene.updateMatrixWorld(true)

        const modelSize = new THREE.Vector3()
        new THREE.Box3().setFromObject(scene).getSize(modelSize)

        // Width is measured in the pose the model actually holds, since a turned model is wider
        // on screen than its unrotated box.
        scene.rotation.set(0, FRONT_ANGLE, 0)
        scene.updateMatrixWorld(true)
        const facedSize = new THREE.Vector3()
        new THREE.Box3().setFromObject(scene).getSize(facedSize)
        scene.rotation.set(0, 0, 0)
        scene.updateMatrixWorld(true)

        let screenHeight = modelSize.y
        const screenCentre = new THREE.Vector3()
        if (screen) {
            const screenBox = new THREE.Box3().setFromObject(screen)
            const screenSize = new THREE.Vector3()
            screenBox.getSize(screenSize)
            screenBox.getCenter(screenCentre)
            screenHeight = screenSize.y

            // The screen is a flat quad, so of its three dimensions the two largest are its width
            // and height. Photo mode needs that ratio to letterbox correctly.
            const sorted = [screenSize.x, screenSize.y, screenSize.z].sort((a, b) => b - a)
            if (materialRef.current) {
                materialRef.current.uniforms.uScreenAspect.value = sorted[0] / sorted[1]
            }
        }

        measured.current = {
            modelHeight: modelSize.y || 1,
            modelWidth: facedSize.x || 1,
            screenHeight: screenHeight || 1,
            screenCentre,
        }

        scene.scale.copy(pose.scale)
        scene.rotation.copy(pose.rotation)
        scene.position.copy(pose.position)
        scene.updateMatrixWorld(true)

        spot.current = restingSpot()
        tween.current = 1
        invalidate()
    }, [scene, invalidate])

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
        // While it is off, rebooting, or busy being a television, poking it does nothing.
        if (mode !== 'awake' || spot.current === 'viewer') return

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

    // The hit area is a plain fixed div moved by the render loop, so clicking the model needs no
    // pointer events on the canvas and no React render per frame.
    useEffect(() => {
        const el = hitRef.current
        if (!el) return
        el.addEventListener('click', handleClick)
        return () => el.removeEventListener('click', handleClick)
    })

    // ANIMATION FRAME
    useFrame((state, delta) => {
        const model = modelRef.current
        const geom = measured.current
        if (!model || !geom) return

        const width = state.size.width
        const height = state.size.height
        const camera = state.camera as THREE.PerspectiveCamera
        const visibleHeight =
            2 * camera.position.z * Math.tan(THREE.MathUtils.degToRad(camera.fov) * 0.5)
        const perPixel = visibleHeight / height

        // --- where it is going ---
        const boxToSize = (box: number) => (HERO_SCALE * geom.modelHeight * box) / visibleHeight
        let target: Placement

        if (spot.current === 'viewer') {
            const screenPx = VIEWER_FILL * Math.min(width, height)
            const byScreen = (screenPx * geom.modelHeight) / geom.screenHeight
            const aspect = geom.modelWidth / geom.modelHeight
            target = {
                x: width / 2,
                y: height / 2,
                size: Math.min(
                    byScreen,
                    VIEWER_MAX_HEIGHT * height,
                    (VIEWER_MAX_WIDTH * width) / aspect
                ),
            }
        } else {
            const anchor = spot.current === 'hero' ? document.getElementById('pc-hero-anchor') : null
            if (anchor) {
                const rect = anchor.getBoundingClientRect()
                target = {
                    x: rect.left + rect.width / 2,
                    y: rect.top + rect.height / 2,
                    size: boxToSize(rect.height),
                }
            } else {
                target = {
                    x: width - CORNER_INSET - CORNER_SIZE / 2,
                    y: height - CORNER_INSET - CORNER_SIZE / 2,
                    size: boxToSize(CORNER_SIZE),
                }
            }
        }

        const duration =
            spot.current === 'viewer' || fromSpot.current === 'viewer' ? FLY_MS : MOVE_MS
        if (tween.current < 1) {
            tween.current = Math.min(1, tween.current + (delta * 1000) / duration)
            invalidate()
        }

        const t = easeInOut(tween.current)
        const start = tween.current >= 1 ? target : from.current
        here.current = {
            x: lerp(start.x, target.x, t),
            y: lerp(start.y, target.y, t),
            size: lerp(start.size, target.size, t),
        }

        // How much of a television it currently is: drives the shader, and centres the glass
        // rather than the case.
        const viewing = spot.current === 'viewer' ? t : fromSpot.current === 'viewer' ? 1 - t : 0

        if (tween.current >= 1 && spot.current !== 'viewer' && !settled.current) {
            settled.current = true
            window.dispatchEvent(new CustomEvent('crtViewerSettled'))
        }

        // --- pose ---
        let targetY = FRONT_ANGLE
        let targetX = 0

        if (mode === 'dizzy') {
            const clock = state.clock.elapsedTime
            model.rotation.y = FRONT_ANGLE + Math.sin(clock * 30) * 0.08
            model.rotation.x = Math.sin(clock * 22) * 0.04
            invalidate()
        } else if (mode === 'off' || mode === 'booting') {
            model.rotation.y += (FRONT_ANGLE - model.rotation.y) * 0.08
            model.rotation.x += (0.12 - model.rotation.x) * 0.08
            invalidate()
        } else {
            // Showing a picture it faces you squarely and stops chasing the cursor.
            targetY = lerp(Math.atan2(mousePos.x, 1) * 0.5 + FRONT_ANGLE, FRONT_ANGLE, viewing)
            targetX = lerp(Math.max(-0.15, Math.min(0.25, -mousePos.y * 0.15)), 0, viewing)
            model.rotation.y += (targetY - model.rotation.y) * 0.08
            model.rotation.x += (targetX - model.rotation.x) * 0.08
        }

        // --- place and size ---
        const scale = (here.current.size * perPixel) / geom.modelHeight
        const bounced = bounce > 0 ? Math.sin(bounce * Math.PI) * 0.15 : 0
        model.scale.setScalar(scale * (1 + bounced))

        const worldX = (here.current.x - width / 2) * perPixel
        const worldY = -(here.current.y - height / 2) * perPixel

        // Centre the glass, not the case, once it is being looked through.
        const offset = geom.screenCentre
            .clone()
            .applyEuler(model.rotation)
            .multiplyScalar(scale * viewing)
        model.position.set(worldX - offset.x, worldY - offset.y, -offset.z)

        // --- what the screen shows ---
        const material = materialRef.current
        if (material) {
            material.uniforms.uMix.value = THREE.MathUtils.smoothstep(viewing, 0.15, 0.6)
            material.uniforms.uOpen.value = THREE.MathUtils.smoothstep(viewing, 0.45, 1)
        }

        // --- the hit area follows ---
        const hit = hitRef.current
        if (hit) {
            const box = here.current.size
            hit.style.width = `${box}px`
            hit.style.height = `${box}px`
            hit.style.transform = `translate3d(${here.current.x - box / 2}px, ${
                here.current.y - box / 2
            }px, 0)`
            hit.style.pointerEvents = spot.current === 'viewer' ? 'none' : 'auto'
        }

        const posed =
            Math.abs(targetY - model.rotation.y) < SETTLED &&
            Math.abs(targetX - model.rotation.x) < SETTLED
        if (!posed || tween.current < 1) invalidate()
    })

    return (
        <>
            <ambientLight intensity={0.5} />
            <directionalLight position={[0, 5, 5]} intensity={0.8} />
            <primitive
                ref={modelRef}
                object={scene}
                position={[0, 0, 0]}
                scale={HERO_SCALE}
                rotation={[0, FRONT_ANGLE, 0]}
                dispose={null}
            />
        </>
    )
}

export default function PCModelCanvas() {
    const hitRef = useRef<HTMLDivElement>(null)

    return (
        <div className="w-full h-full">
            <Canvas
                camera={{ position: [0, 0, 5], fov: 60 }}
                dpr={[1, 2]}
                frameloop="demand"
                performance={{ min: 0.5 }}
                style={{ pointerEvents: 'none' }}
            >
                <Suspense fallback={null}>
                    <Scene hitRef={hitRef} />
                    <Preload all />
                </Suspense>
            </Canvas>
            <div
                ref={hitRef}
                aria-hidden="true"
                style={{
                    position: 'fixed',
                    left: 0,
                    top: 0,
                    width: 0,
                    height: 0,
                    cursor: 'pointer',
                    pointerEvents: 'auto',
                }}
            />
        </div>
    )
}
