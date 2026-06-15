function getLocale() {
  if (typeof document !== 'undefined' && document.documentElement.lang === 'en') {
    return 'en-US'
  }

  return 'ru-RU'
}

function getLanguage() {
  return getLocale() === 'en-US' ? 'en' : 'ru'
}

export function formatNumber(value: number | null | undefined, fractionDigits = 1) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return '-'
  }

  return new Intl.NumberFormat(getLocale(), {
    maximumFractionDigits: fractionDigits,
    minimumFractionDigits: fractionDigits,
  }).format(value)
}

export function formatCompactNumber(value: number | null | undefined) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return '-'
  }

  return new Intl.NumberFormat(getLocale(), {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value)
}

export function formatInteger(value: number | null | undefined) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return '-'
  }

  return new Intl.NumberFormat(getLocale(), {
    maximumFractionDigits: 0,
  }).format(Math.round(value))
}

export function formatPercent(value: number | null | undefined, fractionDigits = 1) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return '-'
  }

  return `${formatNumber(value, fractionDigits)}%`
}

export function formatMoney(value: number | null | undefined, currency = 'RUB', compact = false) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return '-'
  }

  return new Intl.NumberFormat(getLocale(), {
    style: 'currency',
    currency,
    notation: compact ? 'compact' : 'standard',
    maximumFractionDigits: compact ? 1 : 0,
  }).format(value)
}

export function formatDuration(minutes: number | null | undefined) {
  if (minutes === null || minutes === undefined || Number.isNaN(minutes)) {
    return '-'
  }

  const hours = Math.floor(minutes / 60)
  const rest = Math.round(minutes % 60)

  if (getLanguage() === 'en') {
    if (hours <= 0) {
      return `${rest} min`
    }

    return `${hours} h ${rest} min`
  }

  if (hours <= 0) {
    return `${rest} мин`
  }

  return `${hours} ч ${rest} мин`
}
