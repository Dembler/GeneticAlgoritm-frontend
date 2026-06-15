import type {
  CargoProfile,
  OptimizationMode,
  OptimizationStrategy,
  PriorityProfile,
  TransportProfile,
  VehicleClass,
} from '@/shared/api/route.types'

export const profileLabels: Record<TransportProfile, string> = {
  driving: 'Авто',
  walking: 'Пешком',
  cycling: 'Вело',
}

export const vehicleLabels: Record<VehicleClass, string> = {
  passenger: 'Легковой',
  light_truck: 'Малый грузовик',
  heavy_truck: 'Тяжелый грузовик',
}

export const priorityLabels = {
  balanced: 'Сбалансированный режим',
  fastest: 'Скорость',
  cheapest: 'Стоимость',
  greenest: 'Экономия топлива',
} satisfies Partial<Record<PriorityProfile, string>>

export const priorityOptions = Object.entries(priorityLabels) as Array<
  [Exclude<PriorityProfile, 'safest'>, string]
>

export const optimizationModeLabels: Record<OptimizationMode, string> = {
  weighted: 'Взвешенная оценка',
  pareto: 'Парето-подход',
}

export const strategyLabels: Record<OptimizationStrategy, string> = {
  strict: 'Строгий режим',
  balanced: 'Сбалансированный режим',
  custom: 'Свои веса',
  'user-driven': 'Пользовательский режим',
}

export const cargoLabels: Record<CargoProfile, string> = {
  standard: 'Стандартный',
  perishable: 'Скоропортящийся',
  heavy: 'Тяжелый',
}

export const fuelLabels = {
  petrol: 'Бензин',
  diesel: 'Дизель',
} as const

export const criteriaLabels: Record<string, string> = {
  distance: 'Расстояние',
  duration: 'Время движения',
  fuel_cost: 'Топливо и платные дороги',
  emissions: 'Выбросы CO2',
  congestion: 'Трафик',
  weather_risk: 'Погодный фактор',
  reliability: 'Надежность',
  safety: 'Безопасность',
  tolls: 'Платные дороги',
  road_quality: 'Качество дороги',
  dynamic_events: 'Дорожные события',
  operational_cost: 'Полная стоимость',
  cargo_risk: 'Грузовой фактор',
}

export const constraintLabels: Record<string, string> = {
  max_distance_km: 'Макс. расстояние',
  max_duration_min: 'Макс. время',
  max_fuel_cost: 'Макс. топливо',
  max_operational_cost: 'Макс. стоимость',
  max_co2_kg: 'Макс. CO2',
  max_safety_risk: 'Макс. дорожный фактор',
  max_cargo_risk: 'Макс. грузовой фактор',
  infrastructure_access: 'Ограничения транспорта',
  temporal_access: 'Временной доступ',
}
