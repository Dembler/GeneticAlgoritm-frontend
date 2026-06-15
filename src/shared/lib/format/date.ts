export function formatDate(value: Date, locale = 'ru-RU'): string {
  return value.toLocaleDateString(locale, {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
  })
}
