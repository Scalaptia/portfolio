// PC FACES
// Each face is a 12x12 grid. Characters:
//   . = empty (background)
//   # = main color (foreground)
//   @ = accent color (blush, tongue, etc)
//   Any letter or symbol = drawn as text, a word at a time
// There is no hollow-block marker. 'O' used to be one, which quietly turned the O in FERNANDO,
// HARO, BOOTING and WELCOME into a square. If you want hollow blocks again, pick a character that
// cannot appear in a word.

export const CRT_COLORS = {
    green: { bg: '#001100', fg: '#00FF41', glow: '#00FF4180' },
    amber: { bg: '#110800', fg: '#FFB000', glow: '#FFB00080' },
    blue: { bg: '#000815', fg: '#00D4FF', glow: '#00D4FF80' },
    pink: { bg: '#150010', fg: '#FF6B9D', glow: '#FF6B9D80' },
    off: { bg: '#050505', fg: '#050505', glow: '#05050500' },
} as const

export type ColorScheme = typeof CRT_COLORS[keyof typeof CRT_COLORS]

export interface FaceData {
    name: string
    color: ColorScheme
    accent?: string
    art: string[]
}

export const FACES: FaceData[] = [
    {
        name: 'Normal',
        color: CRT_COLORS.green,
        art: [
            '............',
            '............',
            '............',
            '..##....##..',
            '..##....##..',
            '............',
            '.....##.....',
            '............',
            '..#......#..',
            '...######...',
            '............',
            '............',
        ]
    },
    {
        name: 'Happy',
        color: CRT_COLORS.amber,
        accent: '#FF6B9D',
        art: [
            '............',
            '............',
            '............',
            '..###..###..',
            '............',
            '............',
            '............',
            '............',
            '...#.#.#.#..',
            '....#.#.#...',
            '............',
            '............',
        ]
    },
    {
        name: 'Surprised',
        color: CRT_COLORS.green,
        art: [
            '............',
            '............',
            '..###..###..',
            '..#.#..#.#..',
            '..###..###..',
            '............',
            '............',
            '.....##.....',
            '....#..#....',
            '.....##.....',
            '............',
            '............',
        ]
    },
    {
        name: 'Wink',
        color: CRT_COLORS.blue,
        art: [
            '............',
            '............',
            '.........#..',
            '..###..##...',
            '.......##...',
            '............',
            '............',
            '.......#....',
            '...####.....',
            '............',
            '............',
            '............',
        ]
    },
    {
        name: 'Love',
        color: CRT_COLORS.pink,
        art: [
            '............',
            '............',
            '..#.#..#.#..',
            '..###..###..',
            '...#....#...',
            '............',
            '............',
            '............',
            '...######...',
            '............',
            '............',
            '............',
        ]
    },
    {
        name: 'Sleepy',
        color: CRT_COLORS.green,
        art: [
            '..........##',
            '...........#',
            '..........##',
            '.###..###...',
            '............',
            '............',
            '............',
            '............',
            '....####....',
            '............',
            '............',
            '............',
        ]
    },
    {
        name: 'Excited',
        color: CRT_COLORS.amber,
        accent: '#FF6B9D',
        art: [
            '............',
            '............',
            '..#......#..',
            '...#....#...',
            '..#......#..',
            '............',
            '............',
            '...#....#...',
            '....#@@#....',
            '....####....',
            '............',
            '............',
        ]
    },
    {
        name: 'Cool',
        color: CRT_COLORS.blue,
        art: [
            '............',
            '............',
            '............',
            '.####.####..',
            '.#..###..#..',
            '.####.####..',
            '............',
            '............',
            '..#.........',
            '...#####....',
            '............',
            '............',
        ]
    }
]

// Blink face (used for idle animation)
export const BLINK_FACE: FaceData = {
    name: 'Blink',
    color: CRT_COLORS.green,
    art: [
        '............',
        '............',
        '............',
        '..###..###..',
        '............',
        '............',
        '.....##.....',
        '............',
        '..#......#..',
        '...######...',
        '............',
        '............',
    ]
}

// Shown when someone will not stop clicking. Crossed-out eyes, flat mouth, amber warning.
export const DIZZY_FACE: FaceData = {
    name: 'Dizzy',
    color: CRT_COLORS.amber,
    art: [
        '............',
        '............',
        '..#.#..#.#..',
        '...#....#...',
        '..#.#..#.#..',
        '............',
        '.....##.....',
        '............',
        '...######...',
        '............',
        '............',
        '............',
    ]
}

// The screen after it gives up. Nothing lit but the scanlines.
export const OFF_FACE: FaceData = {
    name: 'Off',
    color: CRT_COLORS.off,
    art: Array(12).fill('............'),
}

// Boot/intro animation frames
export interface IntroFrame {
    art: string[]
    color: ColorScheme
    duration: number
}

export const INTRO_FRAMES: IntroFrame[] = [
    {
        color: CRT_COLORS.green,
        duration: 600,
        art: [
            '............',
            '............',
            '..BOOTING...',
            '............',
            '.[##.....]..',
            '............',
            '............',
            '............',
            '............',
            '............',
            '............',
            '............',
        ]
    },
    {
        color: CRT_COLORS.green,
        duration: 400,
        art: [
            '............',
            '............',
            '..BOOTING...',
            '............',
            '.[####...]..',
            '............',
            '............',
            '............',
            '............',
            '............',
            '............',
            '............',
        ]
    },
    {
        color: CRT_COLORS.green,
        duration: 400,
        art: [
            '............',
            '............',
            '..BOOTING...',
            '............',
            '.[######.]..',
            '............',
            '............',
            '............',
            '............',
            '............',
            '............',
            '............',
        ]
    },
    {
        color: CRT_COLORS.green,
        duration: 300,
        art: [
            '............',
            '............',
            '..BOOTING...',
            '............',
            '.[########].',
            '............',
            '....OK!.....',
            '............',
            '............',
            '............',
            '............',
            '............',
        ]
    },
    {
        color: CRT_COLORS.amber,
        duration: 1000,
        art: [
            '............',
            '............',
            '............',
            '............',
            '..HAROGATO..',
            '............',
            '....<3<3....',
            '............',
            '..WELCOME!..',
            '............',
            '............',
            '............',
        ]
    },
]
