import { createI18n } from 'vue-i18n'

import { defaultLocale, getStoredLocale, messages } from '@/shared/i18n'

const initialLocale = getStoredLocale()

if (typeof document !== 'undefined') {
  document.documentElement.lang = initialLocale
}

export const i18n = createI18n({
  legacy: false,
  locale: initialLocale,
  fallbackLocale: defaultLocale,
  messages,
  globalInjection: true,
})
