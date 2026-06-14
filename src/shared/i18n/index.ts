import en from './locales/en'
import ru from './locales/ru'

export const messages = { en, ru } as const

export type Locale = keyof typeof messages

export const defaultLocale: Locale = 'ru'
export const supportedLocales = Object.keys(messages) as Locale[]
export const localeStorageKey = 'app-locale'

export function isSupportedLocale(value: unknown): value is Locale {
  return typeof value === 'string' && supportedLocales.includes(value as Locale)
}

export function getStoredLocale(): Locale {
  if (typeof window === 'undefined') {
    return defaultLocale
  }

  const storedLocale = window.localStorage.getItem(localeStorageKey)

  return isSupportedLocale(storedLocale) ? storedLocale : defaultLocale
}
