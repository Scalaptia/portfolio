import { Canvas, useFrame } from '@react-three/fiber'
import { useGLTF, Preload } from '@react-three/drei'
import { useRef, Suspense, useState, useEffect } from 'react'
import * as THREE from 'three'

import { FACES, BLINK_FACE } from './pc-model/faces'
import { playMeowSound } from './pc-model/sounds'
import { drawFace, createFaceCanvas, drawFromArt } from './pc-model/drawing'

useGLTF.preload('/models/mac_minus.glb')

function Scene() {
    const { scene } = useGLTF('/models/mac_minus.glb', true)
    const modelRef = useRef<THREE.Group>(null)
    
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 })
    const [bounce, setBounce] = useState(0)
    const [expression, setExpression] = useState(0)
    const [isBlinking, setIsBlinking] = useState(false)
    const [isHeroHovered, setIsHeroHovered] = useState(false)
    
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
        
        canvasRef.current = createFaceCanvas(128)
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

        if (isHeroHovered) {
            drawFace(ctx, FACES[4])
        } else if (isBlinking) {
            drawFromArt(ctx, BLINK_FACE.art, BLINK_FACE.color)
        } else {
            drawFace(ctx, FACES[expression % FACES.length])
        }
        textureRef.current.needsUpdate = true
    }

    useEffect(updateFace, [expression, isHeroHovered, isBlinking])

    // BLINK ANIMATION
    useEffect(() => {
        const scheduleBlink = () => {
            const delay = 3000 + Math.random() * 5000
            blinkTimer.current = setTimeout(() => {
                if (expression === 0 && !isHeroHovered) {
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
    }, [isHeroHovered, expression])

    // INTERACTION
    const triggerBounce = () => {
        setBounce(1)
        setTimeout(() => setBounce(0), 300)
    }

    const handleClick = () => {
        triggerBounce()
        const next = (expression + 1) % FACES.length
        setExpression(next)
        playMeowSound(next)
    }

    // ANIMATION FRAME
    useFrame(() => {
        if (!modelRef.current) return

        const frontAngle = Math.PI + 1.5
        const targetY = Math.atan2(mousePos.x, 1) * 0.5 + frontAngle
        // Limit vertical rotation: can look up a bit and down
        const targetX = Math.max(-0.35, Math.min(0.8, -mousePos.y * 0.3))

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

export default function PCModel() {
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
