import { defineConfig } from 'astro/config'
import tailwind from '@astrojs/tailwind'
import react from '@astrojs/react'
import imageSizes from './plugins/imageSizes.mjs'

// https://astro.build/config
export default defineConfig({
    integrations: [tailwind(), react()],
    i18n: {
        locales: ['en', 'es'],
        defaultLocale: 'en',
        routing: {
            prefixDefaultLocale: false,
        },
        fallback: {
            es: 'en',
        },
    },
    vite: {
        plugins: [imageSizes()],
        server: {
            allowedHosts: true,
            // The arcade API is the Worker in worker/. Run `npm run dev:api` next to `npm run dev`
            // and astro dev hands /api over to it. Without it, the games run without a scoreboard.
            proxy: {
                '/api': 'http://localhost:8787',
            },
        },
        ssr: {
            noExternal: ['pixelarticons'],
        },
    },
})
