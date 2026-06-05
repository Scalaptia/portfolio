import english from '@/i18n/en.json'
import spanish from '@/i18n/es.json'

const LANG = {
    ENGLISH: 'en',
    SPANISH: 'es',
}

export const getI18N = ({
    currentLocale = 'en',
}: {
    currentLocale: string | undefined
}): typeof english => {
    if (currentLocale === LANG.SPANISH) return { ...english, ...spanish } as typeof english
    return english
}
