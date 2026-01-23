import { Canvas, useThree } from '@react-three/fiber'
import { useGLTF, Preload } from '@react-three/drei'
import { useRef, Suspense, useState, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

// Preload the model
useGLTF.preload('/models/mac_minus.glb')

// Robotic cat meow sound effects with variations
const playMeowSound = (variant: number = 0) => {
    try {
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
        const oscillator = audioContext.createOscillator()
        const gainNode = audioContext.createGain()
        const filter = audioContext.createBiquadFilter()
        
        // Connect audio nodes
        oscillator.connect(filter)
        filter.connect(gainNode)
        gainNode.connect(audioContext.destination)
        
        // Different cat-like meow variants
        const variants = [
            // Variant 0: Classic "meow" - starts high, dips, rises
            {
                type: 'sine' as OscillatorType,
                freqPoints: [
                    { time: 0, freq: 800 },
                    { time: 0.08, freq: 500 },
                    { time: 0.2, freq: 700 }
                ],
                duration: 0.25,
                filterFreq: 3000
            },
            // Variant 1: Short "mew" - high pitched
            {
                type: 'triangle' as OscillatorType,
                freqPoints: [
                    { time: 0, freq: 1000 },
                    { time: 0.05, freq: 800 },
                    { time: 0.12, freq: 650 }
                ],
                duration: 0.15,
                filterFreq: 3500
            },
            // Variant 2: Questioning "mrrow?" - rises at end
            {
                type: 'sine' as OscillatorType,
                freqPoints: [
                    { time: 0, freq: 600 },
                    { time: 0.1, freq: 500 },
                    { time: 0.22, freq: 900 }
                ],
                duration: 0.28,
                filterFreq: 2800
            },
            // Variant 3: Playful chirp - quick up and down
            {
                type: 'triangle' as OscillatorType,
                freqPoints: [
                    { time: 0, freq: 700 },
                    { time: 0.06, freq: 1100 },
                    { time: 0.15, freq: 600 }
                ],
                duration: 0.18,
                filterFreq: 3200
            }
        ]
        
        const sound = variants[variant % variants.length]
        
        // Add slight randomness for natural variation
        const randomFactor = 0.95 + Math.random() * 0.1
        
        // Setup oscillator
        oscillator.type = sound.type
        
        // Create meow-like frequency curve
        oscillator.frequency.setValueAtTime(sound.freqPoints[0].freq * randomFactor, audioContext.currentTime)
        
        for (let i = 1; i < sound.freqPoints.length; i++) {
            const point = sound.freqPoints[i]
            oscillator.frequency.linearRampToValueAtTime(
                point.freq * randomFactor,
                audioContext.currentTime + point.time
            )
        }
        
        // Setup filter for robotic edge
        filter.type = 'lowpass'
        filter.frequency.setValueAtTime(sound.filterFreq, audioContext.currentTime)
        filter.Q.setValueAtTime(3, audioContext.currentTime)
        
        // Natural meow envelope - starts medium, peaks, fades
        gainNode.gain.setValueAtTime(0.15, audioContext.currentTime)
        gainNode.gain.linearRampToValueAtTime(0.25, audioContext.currentTime + 0.05)
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + sound.duration)
        
        oscillator.start(audioContext.currentTime)
        oscillator.stop(audioContext.currentTime + sound.duration)
    } catch (e) {
        // Silently fail if audio context not available
    }
}

function Scene() {
    const { scene } = useGLTF('/models/mac_minus.glb', true)
    const modelRef = useRef<THREE.Group>(null)
    const [isFollowing, setIsFollowing] = useState(false)
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 })
    const [bounce, setBounce] = useState(0)
    const [clickCount, setClickCount] = useState(0)
    const { camera, size } = useThree()

    useEffect(() => {
        const handleMouseMove = (event: MouseEvent) => {
            if (isFollowing) {
                // Get canvas bounds to calculate relative position
                const canvas = document.querySelector('canvas')
                if (canvas) {
                    const rect = canvas.getBoundingClientRect()
                    // Calculate mouse position relative to canvas center
                    const x = ((event.clientX - rect.left) / rect.width) * 2 - 1
                    const y = -((event.clientY - rect.top) / rect.height) * 2 + 1
                    
                    setMousePos({ x, y })
                }
            }
        }

        window.addEventListener('mousemove', handleMouseMove)
        return () => window.removeEventListener('mousemove', handleMouseMove)
    }, [isFollowing])

    const handleClick = () => {
        setBounce(1)
        setTimeout(() => setBounce(0), 300)
        
        // Toggle following mode and play different sound each time
        const newClickCount = clickCount + 1
        setClickCount(newClickCount)
        playMeowSound(newClickCount % 4)
        setIsFollowing(!isFollowing)
    }

    useFrame(() => {
        if (modelRef.current) {
            if (isFollowing) {
                // Calculate angle to look at mouse (only rotation, no position change)
                const targetRotationY = Math.atan2(mousePos.x, 1) * 0.5 + Math.PI + 1.5
                const targetRotationX = -mousePos.y * 0.2
                
                // Smooth rotation towards mouse
                modelRef.current.rotation.y += (targetRotationY - modelRef.current.rotation.y) * 0.1
                modelRef.current.rotation.x += (targetRotationX - modelRef.current.rotation.x) * 0.1
            } else {
                // Smooth return to neutral X rotation
                modelRef.current.rotation.x += (0 - modelRef.current.rotation.x) * 0.05
                
                // Continuous gentle Y rotation (idle animation)
                modelRef.current.rotation.y += 0.002
            }
            
            // Bounce effect
            if (bounce > 0) {
                const scale = 1.1 + Math.sin(bounce * Math.PI) * 0.2
                modelRef.current.scale.set(scale, scale, scale)
            } else {
                // Smooth return to normal scale
                const currentScale = modelRef.current.scale.x
                const targetScale = 1.1
                modelRef.current.scale.set(
                    currentScale + (targetScale - currentScale) * 0.1,
                    currentScale + (targetScale - currentScale) * 0.1,
                    currentScale + (targetScale - currentScale) * 0.1
                )
            }
        }
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
        <div style={{ width: '100%', height: '100%' }}>
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
