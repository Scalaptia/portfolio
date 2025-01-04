import { ui, defaultLang } from './ui'
const showDefaultLang = false

export function getLangFromUrl(url: URL) {
    const [, lang] = url.pathname.split('/')
    if (lang in ui) return lang as keyof typeof ui
    return defaultLang
}

export function useTranslations(lang: keyof typeof ui) {
    return function t(key: keyof (typeof ui)[typeof defaultLang]) {
        return ui[lang][key] || ui[defaultLang][key]
    }
}

export function useTranslatedPath(lang: keyof typeof ui) {
    return function translatePath(path: string, l: string = lang) {
        // Get current path from window.location if available
        const currentPath =
            typeof window !== 'undefined' ? window.location.pathname : path

        // Remove language prefix if exists
        const pathWithoutLang = currentPath.replace(/^\/[a-z]{2}\//, '/')

        // Return path with new language prefix
        return !showDefaultLang && l === defaultLang
            ? pathWithoutLang
            : `/${l}${pathWithoutLang}`
    }
}
