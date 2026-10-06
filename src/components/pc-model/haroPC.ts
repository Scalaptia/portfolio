// HARO-PC, the machine. Built here out of primitives rather than loaded from a model file, so
// every proportion is a number in this file and the case matches the one drawn in HTML around the
// picture viewer and harogatOS. See docs/ART_DIRECTION.md.
//
// It faces +Z. Every solid part gets an ink outline, a slightly larger copy of itself drawn from
// the inside in the site's ink colour, the same way every card on the page has a hard border.

import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'

export const PALETTE = {
    paper: '#FBE9C6',
    paperShade: '#EBD5A9',
    ink: '#412C47',
    coral: '#FD8D75',
    glass: '#0F0A11',
}

// Outline thickness in world units. Thin enough to read as a pen line at hero size.
const LINE = 0.035

export interface HaroPC {
    group: THREE.Group
    /** The glass. Its material is replaced with the face texture. */
    screen: THREE.Mesh
    /** The power light, so the scene can dim it when the machine switches off. */
    led: THREE.MeshBasicMaterial
}

const ink = new THREE.MeshBasicMaterial({ color: PALETTE.ink, side: THREE.BackSide })

// Cel shading in three flat steps instead of smooth light: lit, half, shadow. It reads as drawn,
// like the rest of the page, and keeps the cream cream instead of greying it.
const steps = (() => {
    const texture = new THREE.DataTexture(new Uint8Array([90, 180, 255]), 3, 1, THREE.RedFormat)
    texture.minFilter = THREE.NearestFilter
    texture.magFilter = THREE.NearestFilter
    texture.needsUpdate = true
    return texture
})()

function solid(color: string, opts: Partial<THREE.MeshToonMaterialParameters> = {}) {
    return new THREE.MeshToonMaterial({ color, gradientMap: steps, ...opts })
}

/** A mesh plus its outline, both in one group placed where the mesh goes. */
function outlined(geometry: THREE.BufferGeometry, material: THREE.Material, line = LINE) {
    const part = new THREE.Group()
    const mesh = new THREE.Mesh(geometry, material)
    part.add(mesh)
    geometry.computeBoundingBox()
    const size = geometry.boundingBox!.getSize(new THREE.Vector3())
    const hull = new THREE.Mesh(geometry, ink)
    // Grow each axis by the same absolute amount, so thin parts do not get fat outlines.
    hull.scale.set(1 + (2 * line) / size.x, 1 + (2 * line) / size.y, 1 + (2 * line) / Math.max(size.z, 0.001))
    part.add(hull)
    return part
}

function ear(side: 1 | -1): THREE.Group {
    const shape = new THREE.Shape()
    shape.moveTo(-0.32, 0)
    shape.lineTo(0.32, 0)
    shape.lineTo(0.06 * side, 0.5)
    shape.closePath()
    const geometry = new THREE.ExtrudeGeometry(shape, {
        depth: 0.22,
        bevelEnabled: true,
        bevelThickness: 0.04,
        bevelSize: 0.04,
        bevelSegments: 2,
    })
    geometry.translate(0, 0, -0.11)
    const group = outlined(geometry, solid(PALETTE.paper))

    // The pink inside of the ear, a smaller triangle just proud of the front face.
    const inner = new THREE.Shape()
    inner.moveTo(-0.22, 0.04)
    inner.lineTo(0.22, 0.04)
    inner.lineTo(0.055 * side, 0.42)
    inner.closePath()
    const innerMesh = new THREE.Mesh(new THREE.ShapeGeometry(inner), new THREE.MeshBasicMaterial({ color: PALETTE.coral }))
    innerMesh.position.z = 0.152
    group.add(innerMesh)

    group.rotation.z = -side * 0.18
    return group
}

function paw(): THREE.Group {
    const geometry = new THREE.SphereGeometry(0.22, 20, 12)
    geometry.scale(1.15, 0.55, 1)
    return outlined(geometry, solid(PALETTE.paper))
}

// The power cord comes out of the back and curls up like a tail.
function tail(): THREE.Group {
    const curve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(0.55, -0.55, -1.0),
        new THREE.Vector3(0.85, -0.85, -1.35),
        new THREE.Vector3(1.25, -0.7, -1.55),
        new THREE.Vector3(1.45, -0.25, -1.45),
        new THREE.Vector3(1.35, 0.1, -1.25),
        new THREE.Vector3(1.12, 0.05, -1.18),
    ])
    const group = new THREE.Group()
    group.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 48, 0.06, 10, false), solid(PALETTE.ink)))
    return group
}

export function buildHaroPC(): HaroPC {
    const group = new THREE.Group()

    // The case. Slightly wider than tall, so the chin has room under the screen.
    const W = 2.3
    const H = 2.15
    const D = 1.9
    const body = outlined(new RoundedBoxGeometry(W, H, D, 4, 0.2), solid(PALETTE.paper))
    group.add(body)

    // The bezel, a dark rounded frame set into the front, the same ink as the HTML bezel.
    const bezelW = 1.78
    const bezelH = 1.52
    const bezelY = 0.2
    const bezel = new THREE.Mesh(new RoundedBoxGeometry(bezelW, bezelH, 0.08, 4, 0.16), solid(PALETTE.ink))
    bezel.position.set(0, bezelY, D / 2)
    group.add(bezel)

    // The glass. Square cells for a 16x16 face want a square-ish screen.
    const screenGeometry = new THREE.PlaneGeometry(1.42, 1.22)
    // The face canvas is painted mirrored with flipY off (see drawing.ts). Turning the UVs half a
    // turn shows it the right way round.
    const uv = screenGeometry.attributes.uv
    for (let i = 0; i < uv.count; i++) uv.setXY(i, 1 - uv.getX(i), 1 - uv.getY(i))
    uv.needsUpdate = true
    const screen = new THREE.Mesh(screenGeometry, new THREE.MeshBasicMaterial({ color: PALETTE.glass }))
    screen.name = 'Screen'
    screen.position.set(0, bezelY, D / 2 + 0.045)
    group.add(screen)

    // The chin: power light on the left, floppy slot on the right. No name on it.
    const chinY = -0.78
    const ledMaterial = new THREE.MeshBasicMaterial({ color: PALETTE.coral, toneMapped: false })
    const led = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.04), ledMaterial)
    led.position.set(-0.78, chinY, D / 2 + 0.02)
    group.add(led)

    const slot = new THREE.Mesh(new RoundedBoxGeometry(0.62, 0.07, 0.04, 2, 0.02), solid(PALETTE.ink))
    slot.position.set(0.58, chinY, D / 2 + 0.01)
    group.add(slot)

    // Vents down one side, a few dark slits.
    for (let i = 0; i < 4; i++) {
        const vent = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.05, 0.9), solid(PALETTE.paperShade))
        vent.position.set(W / 2 + 0.005, 0.45 - i * 0.16, -0.15)
        group.add(vent)
    }

    // Ears on top, a little in from the corners and leaning out.
    for (const side of [-1, 1] as const) {
        const e = ear(side)
        e.position.set(side * 0.68, H / 2 - 0.04, 0.15)
        group.add(e)
    }

    // Four paws under the case instead of feet.
    for (const [x, z] of [[-0.72, 0.55], [0.72, 0.55], [-0.72, -0.55], [0.72, -0.55]]) {
        const p = paw()
        p.position.set(x, -H / 2 - 0.06, z)
        group.add(p)
    }

    group.add(tail())

    // Centre it vertically, paws and ears included, so it turns in place. Not sideways: the case,
    // ears and paws are already symmetric about x = 0, and the tail sticking out to one side
    // used to drag the box's centre over and push the whole PC off-centre.
    const box = new THREE.Box3().setFromObject(group)
    const centreY = box.getCenter(new THREE.Vector3()).y
    group.children.forEach((child) => (child.position.y -= centreY))

    return { group, screen, led: ledMaterial }
}
