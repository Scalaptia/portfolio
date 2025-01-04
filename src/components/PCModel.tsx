import { Canvas } from '@react-three/fiber'
import { OrbitControls, useGLTF } from '@react-three/drei'
import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

function Scene() {
    const { scene } = useGLTF('/models/mac_minus.glb')
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
        <div>
            <Canvas camera={{ position: [0, 0, 5], fov: 60 }}>
                <Scene />
            </Canvas>
        </div>
    )
}
