// PC FACES
// Each face is a 16x16 grid. Characters:
//   . = empty (background)
//   # = main color (foreground)
//   @ = accent color (blush, tongue, etc)
//   Any letter or symbol = drawn as text, a word at a time
// There is no hollow-block marker. 'O' used to be one, which quietly turned the O in FERNANDO,
// HARO, BOOTING and WELCOME into a square. If you want hollow blocks again, pick a character that
// cannot appear in a word.
//
// 16 rather than 12 because 16 has a real middle: a feature two cells wide sits on columns 7 and 8
// with the same gap either side, and each cell is a whole 16 pixels of the 256 pixel texture. Keep
// faces mirror-symmetric (column c pairs with 15 - c) unless the asymmetry is the joke, like Wink.

export const GRID_SIZE = 16

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

const BLUSH = '#FF6B9D'

export const FACES: FaceData[] = [
    {
        name: 'Normal',
        color: CRT_COLORS.green,
        art: [
            '................',
            '................',
            '................',
            '................',
            '................',
            '....##....##....',
            '....##....##....',
            '....##....##....',
            '................',
            '................',
            '....#......#....',
            '.....######.....',
            '................',
            '................',
            '................',
            '................',
        ]
    },
    {
        name: 'Happy',
        color: CRT_COLORS.amber,
        accent: BLUSH,
        art: [
            '................',
            '................',
            '................',
            '................',
            '................',
            '.....#....#.....',
            '....#.#..#.#....',
            '................',
            '..@@........@@..',
            '....########....',
            '.....#@@@@#.....',
            '......####......',
            '................',
            '................',
            '................',
            '................',
        ]
    },
    {
        name: 'Surprised',
        color: CRT_COLORS.green,
        art: [
            '................',
            '................',
            '................',
            '..####....####..',
            '................',
            '...##......##...',
            '..#..#....#..#..',
            '..#..#....#..#..',
            '...##......##...',
            '................',
            '.......##.......',
            '......#..#......',
            '......#..#......',
            '.......##.......',
            '................',
            '................',
        ]
    },
    {
        name: 'Wink',
        color: CRT_COLORS.blue,
        art: [
            '................',
            '................',
            '................',
            '.............#..',
            '............###.',
            '....##.......#..',
            '....##....#.....',
            '....##...#.#....',
            '................',
            '................',
            '...........#....',
            '......#####.....',
            '................',
            '................',
            '................',
            '................',
        ]
    },
    {
        name: 'Love',
        color: CRT_COLORS.pink,
        accent: '#FFC2D6',
        art: [
            '................',
            '................',
            '................',
            '................',
            '..##.##..##.##..',
            '..#####..#####..',
            '...###....###...',
            '....#......#....',
            '................',
            '.@@..........@@.',
            '.....#....#.....',
            '......####......',
            '................',
            '................',
            '................',
            '................',
        ]
    },
    {
        name: 'Sleepy',
        color: CRT_COLORS.green,
        art: [
            '...........####.',
            '.............#..',
            '............#...',
            '...........####.',
            '.........###....',
            '..........#.....',
            '.........###....',
            '................',
            '...###....###...',
            '................',
            '................',
            '.......##.......',
            '................',
            '................',
            '................',
            '................',
        ]
    },
    {
        name: 'Excited',
        color: CRT_COLORS.amber,
        accent: BLUSH,
        art: [
            '................',
            '..#..........#..',
            '.###........###.',
            '..#..........#..',
            '................',
            '...##......##...',
            '.....#....#.....',
            '...##......##...',
            '................',
            '................',
            '....########....',
            '....#@@@@@@#....',
            '.....#@@@@#.....',
            '......####......',
            '................',
            '................',
        ]
    },
    {
        name: 'Cool',
        color: CRT_COLORS.blue,
        art: [
            '................',
            '................',
            '................',
            '................',
            '.##############.',
            '.##.###..##.###.',
            '..####....####..',
            '................',
            '................',
            '................',
            '...........#....',
            '......#####.....',
            '................',
            '................',
            '................',
            '................',
        ]
    }
]

// Blink face (used for idle animation)
export const BLINK_FACE: FaceData = {
    name: 'Blink',
    color: CRT_COLORS.green,
    art: [
        '................',
        '................',
        '................',
        '................',
        '................',
        '................',
        '................',
        '...###....###...',
        '................',
        '................',
        '....#......#....',
        '.....######.....',
        '................',
        '................',
        '................',
        '................',
    ]
}

// Shown when someone will not stop clicking. Crossed-out eyes, a wobbling mouth, amber warning.
export const DIZZY_FACE: FaceData = {
    name: 'Dizzy',
    color: CRT_COLORS.amber,
    art: [
        '................',
        '................',
        '................',
        '................',
        '...#.#....#.#...',
        '....#......#....',
        '...#.#....#.#...',
        '................',
        '................',
        '................',
        '.....##..##.....',
        '....#..##..#....',
        '................',
        '................',
        '................',
        '................',
    ]
}

// The screen after it gives up. Nothing lit but the scanlines.
export const OFF_FACE: FaceData = {
    name: 'Off',
    color: CRT_COLORS.off,
    art: Array(GRID_SIZE).fill('.'.repeat(GRID_SIZE)),
}

// Boot/intro animation frames
export interface IntroFrame {
    art: string[]
    color: ColorScheme
    accent?: string
    duration: number
}

// A word with an odd number of letters cannot sit on the middle of 16 columns, so it gets a
// trailing space to make the run even. drawFromArt trims it before drawing.
const bootFrame = (bar: string, status = '................'): string[] => [
    '................',
    '................',
    '................',
    '................',
    '...harogatOS ...',
    '................',
    '................',
    bar,
    '................',
    status,
    '................',
    '................',
    '................',
    '................',
    '................',
]

export const INTRO_FRAMES: IntroFrame[] = [
    { color: CRT_COLORS.green, duration: 600, art: bootFrame('..[##........]..') },
    { color: CRT_COLORS.green, duration: 400, art: bootFrame('..[#####.....]..') },
    { color: CRT_COLORS.green, duration: 400, art: bootFrame('..[########..]..') },
    { color: CRT_COLORS.green, duration: 300, art: bootFrame('..[##########]..', '.......OK.......') },
    {
        color: CRT_COLORS.amber,
        accent: BLUSH,
        duration: 1100,
        art: [
            '................',
            '................',
            '................',
            '.....@@..@@.....',
            '....@@@@@@@@....',
            '....@@@@@@@@....',
            '.....@@@@@@.....',
            '......@@@@......',
            '.......@@.......',
            '................',
            '................',
            '....WELCOME!....',
            '................',
            '................',
            '................',
            '................',
        ]
    },
]

// A face a visitor drew, in the same format, dressed in the scheme they picked. Pink gets a paler
// accent so the blush still shows against it, same as Love.
export function guestFace(art: string[], scheme: Exclude<keyof typeof CRT_COLORS, 'off'>): FaceData {
    return {
        name: 'Guest',
        color: CRT_COLORS[scheme],
        accent: scheme === 'pink' ? '#FFC2D6' : BLUSH,
        art,
    }
}
