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
        },
        ssr: {
            noExternal: ['pixelarticons'],
        },
    },
})
