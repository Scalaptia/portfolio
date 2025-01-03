export const languages = {
    en: 'English',
    es: 'Español',
};

export const defaultLang = 'en';

export const ui = {
    en: {
        'home': 'home',
        'blog': 'blog',
        'error': 'error',
        'nav.home': 'home',
        'nav.blog': 'blog',
    },
    es: {
        'home': 'inicio',
        'blog': 'blog',
        'error': 'error',
        'nav.home': 'inicio',
        'nav.blog': 'blog',
    },
} as const;

export const projects: { projects: Project[] } = {
    projects: [
        {
            title: 'Estilist',
            description: 'Fashion discovery platform offering personalized style recommendations based on user preferences and colorimetry.',
            contributions: [
                'Led an agile team of 5 developers through the project lifecycle',
                'Implemented image recognition systems for facial analysis and clothing classification'
            ],
            image: ['/images/estilist-1.webp', '/images/estilist-2.webp', '/images/estilist-3.webp', '/images/estilist-4.webp'],
            tags: ['React', 'Django REST', 'PostgreSQL', 'Azure'],
            repo: 'https://www.github.com/estilist/',
            live: 'https://blue-coast-0a7c0381e.5.azurestaticapps.net/'
        },
        {
            title: 'Espyntar', 
            description: 'Multiplayer drawing and guessing game supporting up to 8 concurrent players in real-time.',
            contributions: [
                'Implemented networking using TCP sockets with a custom communication protocol',
                'Designed and developed core game logic using OOP principles',
            ],
            image: ['/images/espyntar-1.webp', '/images/espyntar-2.webp', '/images/espyntar-3.webp'],
            tags: ['C++', 'Raylib', 'Winsock'],
            repo: 'https://www.github.com/Scalaptia/espyntar'
        },
        {
            title: 'Battleship',
            description: 'Classic battleship game reimagined as a single-player web application with an isometric perspective.',
            contributions: [
                'Integrated Jest for unit testing and reached 100% coverage',
            ],
            image: ['/images/battleship-1.webp', '/images/battleship-2.webp'],
            tags: ['TypeScript', 'Jest'],
            repo: 'https://www.github.com/Scalaptia/battleship',
            live: 'https://scalaptia.github.io/battleship/'
        },
        {
            title: '16-BDH',
            description: 'Interactive educational RPG that explores the historical Battle of Puebla through 3 engaging chapters.',
            contributions: [
                'Developed a custom game engine using C and Raylib',
            ],
            image: ['/images/16bdh-1.webp', '/images/16bdh-2.webp', '/images/16bdh-3.webp', '/images/16bdh-4.webp'],
            tags: ['C', 'Raylib', 'Emscripten'],
            repo: 'https://github.com/Scalaptia/16-Bits-de-Historia',
            live: 'https://scalaptia.github.io/16-Bits-de-Historia/'
        }
    ]
};