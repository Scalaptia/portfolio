import { defineConfig } from 'astro/config'
import tailwind from '@astrojs/tailwind'
import react from '@astrojs/react'

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
})
