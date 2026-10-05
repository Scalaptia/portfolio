import { defineConfig } from 'astro/config'
import tailwindcss from '@tailwindcss/vite'
import react from '@astrojs/react'
import imageSizes from './plugins/imageSizes.mjs'

// https://astro.build/config
export default defineConfig({
    integrations: [react()],
    // Astro 7 strips whitespace the JSX way by default, which glued "Fernando" and "Haro" together
    // in the hero. This keeps the HTML-aware compression every page was written against.
    compressHTML: true,
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
        plugins: [tailwindcss(), imageSizes()],
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
