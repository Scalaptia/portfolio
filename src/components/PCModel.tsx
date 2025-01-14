import { Canvas } from '@react-three/fiber'
import { OrbitControls, useGLTF, Preload } from '@react-three/drei'
import { useRef, Suspense } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

// Preload the model
useGLTF.preload('/models/mac_minus.glb')

function Scene() {
    const { scene } = useGLTF('/models/mac_minus.glb', true)
    const modelRef = useRef<THREE.Group>()

    useFrame(() => {
        if (modelRef.current) {
            modelRef.current.rotation.y += 0.002
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
                dispose={null} // Prevent disposal of model
            />
            <OrbitControls
                enableZoom={false}
                minDistance={2}
                maxDistance={10}
                enablePan={false}
                maxPolarAngle={Math.PI / 2}
                minPolarAngle={Math.PI / 2}
                autoRotate={false}
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