export type AppTheme = 'light' | 'dark'

export const themeStorageKey = 'app-theme'
export const defaultTheme: AppTheme = 'light'

export function isAppTheme(value: unknown): value is AppTheme {
  return value === 'light' || value === 'dark'
}

export function getStoredTheme(): AppTheme {
  if (typeof window === 'undefined') {
    return defaultTheme
  }

  const storedTheme = window.localStorage.getItem(themeStorageKey)

  return isAppTheme(storedTheme) ? storedTheme : defaultTheme
}

export function applyTheme(theme: AppTheme) {
  if (typeof document === 'undefined') {
    return
  }

  document.documentElement.classList.toggle('dark', theme === 'dark')
  document.documentElement.style.colorScheme = theme
}
