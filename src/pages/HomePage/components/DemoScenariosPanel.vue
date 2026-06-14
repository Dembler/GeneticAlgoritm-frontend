<script setup lang="ts">
import {
  AlertTriangle,
  Boxes,
  Flame,
  Leaf,
  Play,
  Route,
  Scale,
  Timer,
  Truck,
} from 'lucide-vue-next'

import { Badge, Button, Card, CardContent, CardHeader, CardTitle } from '@/shared/ui'
import type { RouteRequest } from '@/shared/api/route.types'

import { createDefaultRouteDraft } from '../model/defaultRouteDraft'

type ScenarioId =
  | 'balanced'
  | 'urgent'
  | 'cheap'
  | 'green'
  | 'heavy'
  | 'truck-restricted'
  | 'cvrp'
  | 'pareto'
  | 'strict'

type Scenario = {
  id: ScenarioId
  title: string
  description: string
  effect: string
  enabled: boolean
  icon: typeof Route
}

const emit = defineEmits<{
  applyScenario: [draft: RouteRequest]
  runScenario: [draft: RouteRequest]
}>()

const scenarios: Scenario[] = [
  {
    id: 'balanced',
    title: 'Обычная доставка',
    description: 'Баланс расстояния, времени и полной стоимости.',
    effect: 'Стабильный маршрут без жестких ограничений.',
    enabled: true,
    icon: Route,
  },
  {
    id: 'urgent',
    title: 'Срочная доставка',
    description: 'Вес смещается к времени и трафику.',
    effect: 'Приоритет быстрого прибытия.',
    enabled: true,
    icon: Timer,
  },
  {
    id: 'cheap',
    title: 'Минимальная стоимость',
    description: 'Система снижает топливо, платные дороги и полную стоимость.',
    effect: 'Дешевле при допустимых ограничениях.',
    enabled: true,
    icon: Scale,
  },
  {
    id: 'green',
    title: 'Экономия топлива',
    description: 'Выбор коротких и менее энергозатратных участков.',
    effect: 'Профиль с учетом топлива и выбросов CO2.',
    enabled: true,
    icon: Leaf,
  },
  {
    id: 'heavy',
    title: 'Тяжелый груз',
    description: 'Проверка грузоподъемности, массы и полной стоимости.',
    effect: 'Контроль перегруза.',
    enabled: true,
    icon: Boxes,
  },
  {
    id: 'truck-restricted',
    title: 'Грузовик с ограничениями',
    description: 'Высота, масса, ширина и длина влияют на доступность.',
    effect: 'Обход запрещенных участков.',
    enabled: true,
    icon: Truck,
  },
  {
    id: 'cvrp',
    title: 'Многомашинная доставка',
    description: 'Разделение точек между машинами.',
    effect: 'Визуальный план загрузки.',
    enabled: true,
    icon: Flame,
  },
  {
    id: 'pareto',
    title: 'Парето-альтернативы',
    description: 'Сравнение вариантов по времени, стоимости и расстоянию.',
    effect: 'Несколько объяснимых вариантов.',
    enabled: true,
    icon: Scale,
  },
  {
    id: 'strict',
    title: 'Строгие ограничения',
    description: 'Показываются штрафы, недопустимость и защита исходного порядка.',
    effect: 'Прозрачность ограничений.',
    enabled: true,
    icon: AlertTriangle,
  },
]

function cloneDraft(draft: RouteRequest): RouteRequest {
  return JSON.parse(JSON.stringify(draft)) as RouteRequest
}

function scenarioDraft(id: ScenarioId) {
  const draft = createDefaultRouteDraft()
  draft.random_seed = 42

  if (id === 'urgent') {
    draft.priority_profile = 'fastest'
    draft.criteria_weights.duration = 1.6
    draft.criteria_weights.distance = 0.7
    draft.criteria_weights.operational_cost = 0.8
  }

  if (id === 'cheap') {
    draft.priority_profile = 'cheapest'
    draft.criteria_weights.operational_cost = 1.6
    draft.criteria_weights.duration = 0.7
  }

  if (id === 'green') {
    draft.priority_profile = 'greenest'
    draft.criteria_weights.operational_cost = 1.2
    draft.criteria_weights.distance = 1.1
    draft.criteria_weights.emissions = 0.8
    draft.fuel_consumption_l_per_100km = 7.2
  }

  if (id === 'heavy') {
    draft.vehicle_class = 'heavy_truck'
    draft.cargo.profile = 'heavy'
    draft.cargo.weight_t = 8
    draft.vehicle_capacity_t = 10
    draft.criteria_weights.operational_cost = 1.2
  }

  if (id === 'truck-restricted') {
    draft.priority_profile = 'balanced'
    draft.vehicle_class = 'heavy_truck'
    draft.vehicle_dimensions = {
      height_m: 4.1,
      weight_t: 18,
      width_m: 2.55,
      length_m: 12,
    }
    draft.vehicle_capacity_t = 10
    draft.cargo.profile = 'heavy'
    draft.cargo.weight_t = 8.5
    draft.criteria_weights.operational_cost = 1
  }

  if (id === 'cvrp') {
    draft.vehicle_class = 'heavy_truck'
    draft.vehicle_capacity_t = 5
    draft.cargo.profile = 'heavy'
    draft.cargo.weight_t = 4
    draft.cvrp.vehicle_count = 2
    draft.cvrp.point_demands_t = [0, 2.2, 1.6, 2.4]
    draft.cvrp.return_to_depot = true
    draft.criteria_weights.operational_cost = 1.25
  }

  if (id === 'pareto') {
    draft.optimize_mode = 'pareto'
    draft.max_alternatives = 6
    draft.population_size = 160
    draft.generations = 220
    draft.criteria_weights.distance = 1
    draft.criteria_weights.duration = 1
    draft.criteria_weights.operational_cost = 1
  }

  if (id === 'strict') {
    draft.optimization_strategy = 'strict'
    draft.constraints.max_distance_km = 650
    draft.constraints.max_duration_min = 540
    draft.constraints.max_operational_cost = 12_000
  }

  return cloneDraft(draft)
}

function applyScenario(scenario: Scenario) {
  if (!scenario.enabled) {
    return
  }

  emit('applyScenario', scenarioDraft(scenario.id))
}

function runScenario(scenario: Scenario) {
  if (!scenario.enabled) {
    return
  }

  emit('runScenario', scenarioDraft(scenario.id))
}
</script>

<template>
  <Card class="surface-card">
    <CardHeader class="pb-3">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <CardTitle class="text-base">Сценарии демонстрации</CardTitle>
        <Badge variant="secondary">9 активных</Badge>
      </div>
    </CardHeader>
    <CardContent>
      <div class="scenario-grid">
        <article
          v-for="scenario in scenarios"
          :key="scenario.title"
          class="scenario-card"
          :class="!scenario.enabled && 'scenario-card--disabled'"
        >
          <div class="flex min-w-0 items-start gap-3">
            <span class="scenario-icon">
              <component :is="scenario.icon" class="size-4" />
            </span>
            <div class="min-w-0">
              <div class="flex flex-wrap items-center gap-2">
                <h3>{{ scenario.title }}</h3>
                <Badge v-if="scenario.enabled" variant="secondary">Готово</Badge>
              </div>
              <p>{{ scenario.description }}</p>
              <Badge variant="outline" class="mt-2 whitespace-normal text-left">
                {{ scenario.effect }}
              </Badge>
            </div>
          </div>
          <div class="scenario-actions">
            <Button
              variant="outline"
              size="sm"
              class="rounded-lg"
              :disabled="!scenario.enabled"
              @click="applyScenario(scenario)"
            >
              Настроить
            </Button>
            <Button
              size="sm"
              class="rounded-lg"
              :variant="scenario.enabled ? 'default' : 'outline'"
              :disabled="!scenario.enabled"
              @click="runScenario(scenario)"
            >
              <Play class="size-3.5" />
              {{ scenario.enabled ? 'Запустить' : 'Скоро' }}
            </Button>
          </div>
        </article>
      </div>
    </CardContent>
  </Card>
</template>

<style scoped>
.surface-card {
  background: color-mix(in oklch, var(--card) 90%, transparent);
  box-shadow: 0 16px 45px hsl(0 0% 0% / 0.055);
  backdrop-filter: blur(12px);
}

.scenario-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(18rem, 1fr));
  gap: 0.75rem;
}

.scenario-card {
  display: grid;
  min-width: 0;
  grid-template-columns: minmax(0, 1fr);
  align-items: flex-start;
  gap: 0.75rem;
  border: 1px solid var(--border);
  border-radius: 0.75rem;
  background: color-mix(in oklch, var(--background) 70%, transparent);
  padding: 0.875rem;
}

.scenario-card--disabled {
  background: color-mix(in oklch, var(--muted) 42%, transparent);
}

.scenario-card h3 {
  font-size: 0.875rem;
  font-weight: 700;
  color: var(--foreground);
}

.scenario-card p {
  margin-top: 0.25rem;
  color: var(--muted-foreground);
  font-size: 0.75rem;
  line-height: 1rem;
}

.scenario-icon {
  display: inline-flex;
  width: 2rem;
  height: 2rem;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  border-radius: 0.625rem;
  background: var(--secondary);
  color: var(--primary);
}

.scenario-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-start;
  gap: 0.5rem;
}

@media (max-width: 640px) {
  .scenario-card {
    grid-template-columns: 1fr;
  }

  .scenario-actions {
    justify-content: flex-start;
  }
}
</style>
