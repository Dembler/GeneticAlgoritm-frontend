import ru from './locales/ru'

export const messages = { ru } as const

export type Locale = keyof typeof messages

export const defaultLocale: Locale = 'ru'
