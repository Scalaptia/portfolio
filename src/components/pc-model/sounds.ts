// ============================================================
// 🎵 PC CAT SOUNDS - 8-BIT CHIPTUNE
// ============================================================

type SoundFunction = (ctx: AudioContext, osc1: OscillatorNode, osc2: OscillatorNode, gain2: GainNode, randomFactor: number) => number

// Sound definitions for each expression
const SOUND_VARIANTS: SoundFunction[] = [
    // 0: Normal - Classic 8-bit meow (arpeggio)
    (ctx, osc1, osc2, gain2, rf) => {
        osc1.type = 'square'
        osc2.type = 'square'
        gain2.gain.value = 0.3
        
        const notes = [523, 659, 784, 659, 523].map(n => n * rf)
        notes.forEach((freq, i) => {
            osc1.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.05)
            osc2.frequency.setValueAtTime(freq * 2, ctx.currentTime + i * 0.05)
        })
        return 0.25
    },
    
    // 1: Happy - Quick "mew!" blip
    (ctx, osc1, osc2, gain2, rf) => {
        osc1.type = 'square'
        osc2.type = 'triangle'
        gain2.gain.value = 0.5
        
        osc1.frequency.setValueAtTime(880 * rf, ctx.currentTime)
        osc1.frequency.linearRampToValueAtTime(1200 * rf, ctx.currentTime + 0.03)
        osc1.frequency.linearRampToValueAtTime(660 * rf, ctx.currentTime + 0.1)
        osc2.frequency.setValueAtTime(440 * rf, ctx.currentTime)
        return 0.12
    },
    
    // 2: Surprised - "mrrow?" rising pitch
    (ctx, osc1, osc2, gain2, rf) => {
        osc1.type = 'sawtooth'
        osc2.type = 'square'
        gain2.gain.value = 0.2
        
        osc1.frequency.setValueAtTime(400 * rf, ctx.currentTime)
        osc1.frequency.linearRampToValueAtTime(350 * rf, ctx.currentTime + 0.1)
        osc1.frequency.linearRampToValueAtTime(800 * rf, ctx.currentTime + 0.25)
        osc2.frequency.setValueAtTime(800 * rf, ctx.currentTime)
        osc2.frequency.linearRampToValueAtTime(1600 * rf, ctx.currentTime + 0.25)
        return 0.28
    },
    
    // 3: Wink - Happy purr-chirp with vibrato
    (ctx, osc1, osc2, gain2, rf) => {
        osc1.type = 'triangle'
        osc2.type = 'sine'
        gain2.gain.value = 0.4
        
        const baseFreq = 600 * rf
        osc1.frequency.setValueAtTime(baseFreq, ctx.currentTime)
        for (let i = 0; i < 6; i++) {
            osc1.frequency.setValueAtTime(baseFreq + 50, ctx.currentTime + i * 0.04)
            osc1.frequency.setValueAtTime(baseFreq - 50, ctx.currentTime + i * 0.04 + 0.02)
        }
        osc2.frequency.setValueAtTime(baseFreq * 1.5, ctx.currentTime)
        return 0.24
    },
    
    // 4: Love - Smooth "prrrr" glide
    (ctx, osc1, osc2, gain2, rf) => {
        osc1.type = 'sine'
        osc2.type = 'triangle'
        gain2.gain.value = 0.5
        
        osc1.frequency.setValueAtTime(500 * rf, ctx.currentTime)
        osc1.frequency.linearRampToValueAtTime(700 * rf, ctx.currentTime + 0.15)
        osc1.frequency.linearRampToValueAtTime(600 * rf, ctx.currentTime + 0.3)
        osc2.frequency.setValueAtTime(1000 * rf, ctx.currentTime)
        osc2.frequency.linearRampToValueAtTime(1200 * rf, ctx.currentTime + 0.3)
        return 0.32
    },
    
    // 5: Sleepy - Low rumble "mrrr"
    (ctx, osc1, osc2, gain2, rf) => {
        osc1.type = 'triangle'
        osc2.type = 'sine'
        gain2.gain.value = 0.6
        
        osc1.frequency.setValueAtTime(200 * rf, ctx.currentTime)
        osc1.frequency.linearRampToValueAtTime(150 * rf, ctx.currentTime + 0.3)
        osc2.frequency.setValueAtTime(100 * rf, ctx.currentTime)
        return 0.35
    },
    
    // 6: Excited - Rapid trill
    (ctx, osc1, osc2, gain2, rf) => {
        osc1.type = 'square'
        osc2.type = 'square'
        gain2.gain.value = 0.25
        
        const notes = [700, 900, 700, 900, 1100, 900, 700].map(n => n * rf)
        notes.forEach((freq, i) => {
            osc1.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.025)
            osc2.frequency.setValueAtTime(freq * 0.5, ctx.currentTime + i * 0.025)
        })
        return 0.18
    },
    
    // 7: Cool - Sharp "nya!"
    (ctx, osc1, osc2, gain2, rf) => {
        osc1.type = 'square'
        osc2.type = 'sawtooth'
        gain2.gain.value = 0.3
        
        osc1.frequency.setValueAtTime(1200 * rf, ctx.currentTime)
        osc1.frequency.linearRampToValueAtTime(800 * rf, ctx.currentTime + 0.02)
        osc1.frequency.linearRampToValueAtTime(600 * rf, ctx.currentTime + 0.08)
        osc2.frequency.setValueAtTime(600 * rf, ctx.currentTime)
        return 0.1
    },
]

// Distortion curve for 8-bit crunch
function makeDistortionCurve(amount: number): Float32Array {
    const samples = 44100
    const curve = new Float32Array(samples)
    for (let i = 0; i < samples; i++) {
        const x = (i * 2) / samples - 1
        curve[i] = ((3 + amount) * x * 20 * (Math.PI / 180)) / (Math.PI + amount * Math.abs(x))
    }
    return curve
}

// Browsers cap how many AudioContexts a tab may hold, and this used to open a fresh one on every
// click and never close it. After a handful of clicks the constructor threw, the catch below
// swallowed it, and the cat went silent for the rest of the visit. One shared context fixes it.
let sharedContext: AudioContext | null = null

function getAudioContext(): AudioContext | null {
    try {
        const Ctor = window.AudioContext || (window as any).webkitAudioContext
        if (!Ctor) return null
        if (!sharedContext || sharedContext.state === 'closed') {
            sharedContext = new Ctor()
        }
        // Autoplay policy suspends the context until a gesture; a click is one.
        if (sharedContext.state === 'suspended') void sharedContext.resume()
        return sharedContext
    } catch {
        return null
    }
}

// Play a chiptune meow sound
export function playMeowSound(variant: number = 0): void {
    try {
        const audioContext = getAudioContext()
        if (!audioContext) return

        // Create audio nodes
        const osc1 = audioContext.createOscillator()
        const osc2 = audioContext.createOscillator()
        const gainNode = audioContext.createGain()
        const gain2 = audioContext.createGain()
        const filter = audioContext.createBiquadFilter()
        const distortion = audioContext.createWaveShaper()
        
        // Apply distortion
        distortion.curve = makeDistortionCurve(8)
        
        // Connect nodes
        osc1.connect(filter)
        osc2.connect(gain2)
        gain2.connect(filter)
        filter.connect(distortion)
        distortion.connect(gainNode)
        gainNode.connect(audioContext.destination)
        
        // Random factor for natural variation
        const randomFactor = 0.9 + Math.random() * 0.2
        
        // Get sound configuration
        const soundFn = SOUND_VARIANTS[variant % SOUND_VARIANTS.length]
        const duration = soundFn(audioContext, osc1, osc2, gain2, randomFactor)
        
        // Setup filter
        filter.type = 'lowpass'
        filter.frequency.setValueAtTime(2000 + Math.random() * 1000, audioContext.currentTime)
        filter.Q.setValueAtTime(5, audioContext.currentTime)
        
        // Punchy envelope
        gainNode.gain.setValueAtTime(0, audioContext.currentTime)
        gainNode.gain.linearRampToValueAtTime(0.2, audioContext.currentTime + 0.01)
        gainNode.gain.setValueAtTime(0.15, audioContext.currentTime + 0.02)
        gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + duration)
        
        // Start and stop
        osc1.start(audioContext.currentTime)
        osc2.start(audioContext.currentTime)
        osc1.stop(audioContext.currentTime + duration)
        osc2.stop(audioContext.currentTime + duration)

        // Release the graph once the sound is done, so a long session does not accumulate nodes.
        osc2.onended = () => {
            osc1.disconnect()
            osc2.disconnect()
            gain2.disconnect()
            filter.disconnect()
            distortion.disconnect()
            gainNode.disconnect()
        }
    } catch {
        // Silently fail if audio not available
    }
}

// CRT winding down: pitch falls away and the gain closes.
export function playPowerDownSound(): void {
    try {
        const ctx = getAudioContext()
        if (!ctx) return

        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.type = 'sawtooth'
        osc.connect(gain)
        gain.connect(ctx.destination)

        const now = ctx.currentTime
        osc.frequency.setValueAtTime(440, now)
        osc.frequency.exponentialRampToValueAtTime(40, now + 0.7)
        gain.gain.setValueAtTime(0.14, now)
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.75)

        osc.start(now)
        osc.stop(now + 0.78)
        osc.onended = () => {
            osc.disconnect()
            gain.disconnect()
        }
    } catch {
        // Silently fail if audio not available
    }
}

// Two rising blips, the sound of the machine coming back.
export function playBootSound(): void {
    try {
        const ctx = getAudioContext()
        if (!ctx) return

        const now = ctx.currentTime
        ;[[440, 0], [660, 0.12]].forEach(([freq, offset]) => {
            const osc = ctx.createOscillator()
            const gain = ctx.createGain()
            osc.type = 'square'
            osc.frequency.setValueAtTime(freq, now + offset)
            osc.connect(gain)
            gain.connect(ctx.destination)
            gain.gain.setValueAtTime(0.001, now + offset)
            gain.gain.linearRampToValueAtTime(0.1, now + offset + 0.01)
            gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.1)
            osc.start(now + offset)
            osc.stop(now + offset + 0.12)
            osc.onended = () => {
                osc.disconnect()
                gain.disconnect()
            }
        })
    } catch {
        // Silently fail if audio not available
    }
}
