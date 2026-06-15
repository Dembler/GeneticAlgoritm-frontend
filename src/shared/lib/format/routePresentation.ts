import { formatPercent } from './number'

function isEnglish() {
  return typeof document !== 'undefined' && document.documentElement.lang === 'en'
}

const providerLabelsRu: Record<string, string> = {
  'tomtom-routing': 'TomTom',
  'tomtom routing': 'TomTom',
  tomtom: 'TomTom',
  osrm: 'OSRM',
  'public osrm': 'OSRM',
  fallback: 'Резервная модель',
  'osrm+fallback': 'OSRM + резервная модель',
  backend: 'Backend',
  unknown: 'неизвестно',
}

const providerLabelsEn: Record<string, string> = {
  'tomtom-routing': 'TomTom',
  'tomtom routing': 'TomTom',
  tomtom: 'TomTom',
  osrm: 'OSRM',
  'public osrm': 'OSRM',
  fallback: 'Fallback model',
  'osrm+fallback': 'OSRM + fallback model',
  backend: 'Backend',
  unknown: 'unknown',
}

const statusLabelsRu: Record<string, string> = {
  ok: 'Выполнено',
  active: 'Активно',
  disabled: 'Отключено',
  ready: 'Готово',
  gain: 'Улучшение',
  factor: 'Фактор',
  balanced: 'Сбалансированный режим',
  weighted: 'Взвешенная оценка',
  pareto: 'Парето-подход',
  strict: 'Строгий режим',
  'fallback-ready': 'Готов резервный источник',
  degraded: 'Ограниченная работа',
  unknown: 'неизвестно',
}

const statusLabelsEn: Record<string, string> = {
  ok: 'OK',
  active: 'Active',
  disabled: 'Disabled',
  ready: 'Ready',
  gain: 'Gain',
  factor: 'Factor',
  balanced: 'Balanced mode',
  weighted: 'Weighted score',
  pareto: 'Pareto approach',
  strict: 'Strict mode',
  'fallback-ready': 'Fallback ready',
  degraded: 'Degraded',
  unknown: 'unknown',
}

const integrationLabelsRu: Record<string, string> = {
  'OSRM Routing': 'Маршрутизация OSRM',
  Weather: 'Погода',
  Elevation: 'Рельеф',
  Traffic: 'Трафик',
  'Road quality': 'Качество дороги',
  'Road events': 'Дорожные события',
  'Infrastructure restrictions': 'Ограничения транспорта',
  Tolls: 'Платные дороги',
  'Fuel prices': 'Цены на топливо',
}

const integrationLabelsEn: Record<string, string> = {
  'OSRM Routing': 'OSRM routing',
  Weather: 'Weather',
  Elevation: 'Elevation',
  Traffic: 'Traffic',
  'Road quality': 'Road quality',
  'Road events': 'Road events',
  'Infrastructure restrictions': 'Vehicle restrictions',
  Tolls: 'Tolls',
  'Fuel prices': 'Fuel prices',
}

const sourceLabelsRu: Record<string, string> = {
  'tomtom-routing': 'TomTom',
  'tomtom routing': 'TomTom',
  'tomtom-matrix': 'TomTom Matrix',
  'tomtom matrix': 'TomTom Matrix',
  'tomtom-traffic': 'TomTom Traffic',
  'tomtom traffic': 'TomTom Traffic',
  'tomtom-incidents': 'TomTom Incidents',
  'tomtom incidents': 'TomTom Incidents',
  'public OSRM': 'OSRM',
  'OSRM public': 'OSRM',
  osrm: 'OSRM',
  'OSRM matrix': 'OSRM',
  'Open-Meteo': 'Open-Meteo',
  openmeteo: 'Open-Meteo',
  'MET Norway': 'MET Norway',
  metno: 'MET Norway',
  fallback: 'Резервная модель',
  'synthetic fallback': 'Резервная модель',
  'cached demo provider': 'Демо-источник',
  'not configured': 'не настроено',
  'Haversine matrix': 'Резервная модель',
  'seasonal profile': 'сезонный профиль',
  'synthetic congestion index': 'расчетный индекс трафика',
  backend: 'Backend',
}

const sourceLabelsEn: Record<string, string> = {
  ...sourceLabelsRu,
  fallback: 'Fallback model',
  'synthetic fallback': 'Fallback model',
  'cached demo provider': 'Demo provider',
  'not configured': 'not configured',
  'Haversine matrix': 'Fallback model',
  'seasonal profile': 'seasonal profile',
  'synthetic congestion index': 'synthetic congestion index',
}

const textReplacementsRu: Array<[RegExp, string]> = [
  [
    /The route balances time, cost and risk better than the baseline\./gi,
    'Маршрут выбран, потому что он сокращает расстояние, время в пути и итоговую стоимость по сравнению с исходным порядком точек.',
  ],
  [/Reduced distance by ([\d.,]+)%/gi, 'Расстояние снижено на $1%'],
  [/Distance reduced by ([\d.,]+)%/gi, 'Расстояние снижено на $1%'],
  [/Reduced travel time by ([\d.,]+)%/gi, 'Время в пути снижено на $1%'],
  [/Reduced duration by ([\d.,]+)%/gi, 'Время в пути снижено на $1%'],
  [/Duration reduced by ([\d.,]+)%/gi, 'Время в пути снижено на $1%'],
  [
    /Reduced fuel and toll cost by ([\d.,]+)%/gi,
    'Расходы на топливо и платные дороги снижены на $1%',
  ],
  [/Reduced operational cost by ([\d.,]+)%/gi, 'Полная стоимость снижена на $1%'],
  [/Cost reduced by ([\d.,]+)%/gi, 'Стоимость снижена на $1%'],
  [/Reduced CO2 emissions by ([\d.,]+)%/gi, 'Выбросы CO2 снижены на $1%'],
  [/Road works on (.+?) segment\./gi, 'Дорожные работы на участке $1.'],
  [/Road works/gi, 'дорожные работы'],
  [/Distance/gi, 'расстояние'],
  [/Duration/gi, 'время'],
  [/Operational cost/gi, 'полная стоимость'],
  [/Safety risk/gi, 'дорожный фактор'],
  [/Cargo risk/gi, 'грузовой фактор'],
  [/\bgain\b/gi, 'Улучшение'],
  [/\bfactor\b/gi, 'Фактор'],
  [/\bready\b/gi, 'Готово'],
  [/\bbalanced\b/gi, 'сбалансированный режим'],
  [/\bweighted\b/gi, 'взвешенная оценка'],
  [/\bpareto\b/gi, 'Парето-подход'],
  [/\bstrict\b/gi, 'строгий режим'],
]

const triggerLabelsRu: Record<string, string> = {
  'priority: balanced': 'приоритет: сбалансированный режим',
  'priority: fastest': 'приоритет: скорость',
  'priority: cheapest': 'приоритет: стоимость',
  'priority: safest': 'приоритет: безопасность',
  'priority: greenest': 'приоритет: экономия топлива',
  'traffic: medium': 'трафик: средний',
  'traffic: high': 'трафик: высокий',
  'cargo: standard': 'груз: стандартный',
  'cargo: heavy': 'груз: тяжелый',
}

export function normalizePercentText(value: string) {
  return value.replace(/(\d+)\.(\d+)%/g, '$1,$2%')
}

export function formatMissing(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === '') {
    return isEnglish() ? 'no data' : 'нет данных'
  }

  return String(value)
}

export function formatProvider(value: string | null | undefined) {
  const normalized = value?.trim()

  if (!normalized) {
    return isEnglish() ? 'unknown' : 'неизвестно'
  }

  const labels = isEnglish() ? providerLabelsEn : providerLabelsRu

  return labels[normalized] ?? labels[normalized.toLowerCase()] ?? normalized
}

export function formatTechnicalStatus(value: string | null | undefined) {
  const normalized = value?.trim()

  if (!normalized) {
    return isEnglish() ? 'unknown' : 'неизвестно'
  }

  const labels = isEnglish() ? statusLabelsEn : statusLabelsRu

  return labels[normalized] ?? labels[normalized.toLowerCase()] ?? normalized
}

export function formatDataSource(value: string | null | undefined) {
  const normalized = value?.trim()

  if (!normalized) {
    return isEnglish() ? 'no data' : 'нет данных'
  }

  const labels = isEnglish() ? sourceLabelsEn : sourceLabelsRu

  return labels[normalized] ?? labels[normalized.toLowerCase()] ?? normalized
}

export function hasFallbackSource(value: string | null | undefined) {
  return Boolean(
    value?.toLowerCase().includes('fallback') || value?.toLowerCase().includes('haversine'),
  )
}

export function formatIntegrationName(value: string | null | undefined) {
  const normalized = value?.trim()

  if (!normalized) {
    return isEnglish() ? 'integration' : 'интеграция'
  }

  const labels = isEnglish() ? integrationLabelsEn : integrationLabelsRu

  return labels[normalized] ?? normalized
}

export function translateBackendText(value: string | null | undefined) {
  if (!value) {
    return ''
  }

  if (isEnglish()) {
    return value
  }

  return normalizePercentText(
    textReplacementsRu.reduce(
      (text, [pattern, replacement]) => text.replace(pattern, replacement),
      value,
    ),
  )
}

export function translateTrigger(value: string) {
  return isEnglish() ? value : (triggerLabelsRu[value] ?? value)
}

export function formatImprovement(value: number | null | undefined, fractionDigits = 1) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return isEnglish() ? 'no data' : 'нет данных'
  }

  if (Math.abs(value) < 0.05) {
    return isEnglish() ? 'no improvement' : 'без улучшения'
  }

  return formatPercent(value, fractionDigits)
}
