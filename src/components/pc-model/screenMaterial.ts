// The screen is one material in two jobs: the pixel face it has always shown, and a photograph
// under CRT glass. Both live in the same shader so switching between them is a uniform, not a
// material swap, which means it can cross-fade.
//
// Color handling matches what MeshBasicMaterial did before, so face mode looks unchanged: neither
// texture is decoded in the shader (sRGB photos are decoded by the GPU on sample, via the texture's
// colorSpace) and the result goes out through three's own linearToOutputTexel. That function and
// the sRGB helpers are injected into every ShaderMaterial by WebGLProgram, so there is nothing to
// import for them.

import * as THREE from 'three'

const VERTEX = /* glsl */ `
    varying vec2 vUv;

    void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
`

const FRAGMENT = /* glsl */ `
    varying vec2 vUv;

    uniform sampler2D uFace;
    uniform sampler2D uPhoto;
    uniform float uMix;
    uniform float uOpen;
    uniform float uPhotoAspect;
    uniform float uScreenAspect;
    uniform float uScanlines;
    uniform vec3 uBg;

    const float CURVE = 0.06;
    const float FRINGE = 0.002;

    vec2 barrel(vec2 uv) {
        vec2 c = uv - 0.5;
        return uv + c * dot(c, c) * CURVE;
    }

    void main() {
        vec3 face = texture2D(uFace, vUv).rgb;

        // The mesh UVs are mirrored and the face canvas is painted mirrored to match, so the photo
        // is the only thing that has to be flipped back.
        vec2 uv = barrel(vec2(1.0 - vUv.x, vUv.y));

        // Contain-fit, with the leftover filled by the CRT's own background rather than black so
        // the letterbox still reads as part of the machine.
        float k = uPhotoAspect / uScreenAspect;
        vec2 fit = uv;
        if (k > 1.0) {
            fit.y = (fit.y - 0.5) * k + 0.5;
        } else {
            fit.x = (fit.x - 0.5) / k + 0.5;
        }

        vec3 photo = uBg;
        if (fit.x > 0.0 && fit.x < 1.0 && fit.y > 0.0 && fit.y < 1.0) {
            photo = vec3(
                texture2D(uPhoto, fit + vec2(FRINGE, 0.0)).r,
                texture2D(uPhoto, fit).g,
                texture2D(uPhoto, fit - vec2(FRINGE, 0.0)).b
            );
        }

        photo *= 0.92 + 0.08 * sin(uv.y * uScanlines * 6.2831853);
        vec2 c = uv - 0.5;
        photo *= 1.0 - dot(c, c) * 0.5;

        // Power-on: a bright line that opens into the picture.
        float halfHeight = mix(0.002, 0.5, smoothstep(0.0, 1.0, uOpen));
        float d = abs(uv.y - 0.5);
        float band = 1.0 - smoothstep(halfHeight - 0.01, halfHeight, d);
        float edge = smoothstep(halfHeight - 0.06, halfHeight, d) * band * (1.0 - uOpen);
        photo = mix(uBg, photo, band) + vec3(edge);

        // Past the curve there is no picture, only unlit glass.
        float inside = step(0.0, uv.x) * step(uv.x, 1.0) * step(0.0, uv.y) * step(uv.y, 1.0);
        photo = mix(uBg, photo, inside);

        gl_FragColor = vec4(mix(face, photo, uMix), 1.0);
        gl_FragColor = linearToOutputTexel(gl_FragColor);
    }
`

// A sampler2D uniform cannot be left null, so photo mode starts on one black pixel.
function placeholderTexture(): THREE.DataTexture {
    const texture = new THREE.DataTexture(new Uint8Array([0, 0, 0, 255]), 1, 1)
    texture.needsUpdate = true
    return texture
}

export function createScreenMaterial(faceTexture: THREE.Texture): THREE.ShaderMaterial {
    return new THREE.ShaderMaterial({
        uniforms: {
            uFace: { value: faceTexture },
            uPhoto: { value: placeholderTexture() },
            uMix: { value: 0 },
            uOpen: { value: 0 },
            uPhotoAspect: { value: 1 },
            uScreenAspect: { value: 1 },
            uScanlines: { value: 200 },
            uBg: { value: new THREE.Color('#050505') },
        },
        vertexShader: VERTEX,
        fragmentShader: FRAGMENT,
        side: THREE.DoubleSide,
    })
}

// Photos need linear filtering and anisotropy. The face canvas needs neither, which is exactly why
// the two never shared a texture.
export function preparePhotoTexture(
    texture: THREE.Texture,
    maxAnisotropy: number
): THREE.Texture {
    texture.colorSpace = THREE.SRGBColorSpace
    texture.minFilter = THREE.LinearFilter
    texture.magFilter = THREE.LinearFilter
    texture.generateMipmaps = false
    texture.anisotropy = maxAnisotropy
    texture.needsUpdate = true
    return texture
}
