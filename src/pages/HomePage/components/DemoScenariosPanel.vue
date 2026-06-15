<script setup lang="ts">
import { useI18n } from 'vue-i18n'
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

import { Button, Card, CardContent, CardHeader, CardTitle } from '@/shared/ui'
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
  enabled: boolean
  icon: typeof Route
}

const emit = defineEmits<{
  applyScenario: [draft: RouteRequest]
  runScenario: [draft: RouteRequest]
}>()

const { t } = useI18n({ useScope: 'global' })

const scenarios: Scenario[] = [
  {
    id: 'balanced',
    enabled: true,
    icon: Route,
  },
  {
    id: 'urgent',
    enabled: true,
    icon: Timer,
  },
  {
    id: 'cheap',
    enabled: true,
    icon: Scale,
  },
  {
    id: 'green',
    enabled: true,
    icon: Leaf,
  },
  {
    id: 'heavy',
    enabled: true,
    icon: Boxes,
  },
  {
    id: 'truck-restricted',
    enabled: true,
    icon: Truck,
  },
  {
    id: 'cvrp',
    enabled: true,
    icon: Flame,
  },
  {
    id: 'pareto',
    enabled: true,
    icon: Scale,
  },
  {
    id: 'strict',
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
    <CardHeader class="scenario-header">
      <CardTitle class="scenario-section-title">{{ t('scenarios.title') }}</CardTitle>
      <p class="scenario-section-description">{{ t('scenarios.description') }}</p>
    </CardHeader>
    <CardContent class="scenario-content">
      <div class="scenario-grid">
        <article
          v-for="scenario in scenarios"
          :key="scenario.id"
          class="scenario-card"
          :class="!scenario.enabled && 'scenario-card--disabled'"
        >
          <div class="flex min-w-0 items-start gap-3">
            <span class="scenario-icon">
              <component :is="scenario.icon" class="size-4" />
            </span>
            <div class="min-w-0">
              <h3>{{ t(`scenarios.items.${scenario.id}.title`) }}</h3>
              <p class="scenario-description">
                {{ t(`scenarios.items.${scenario.id}.description`) }}
                {{ t(`scenarios.items.${scenario.id}.effect`) }}
              </p>
            </div>
          </div>
          <div class="scenario-actions">
            <Button
              variant="outline"
              class="scenario-button rounded-lg"
              :disabled="!scenario.enabled"
              @click="applyScenario(scenario)"
            >
              {{ t('scenarios.apply') }}
            </Button>
            <Button
              class="scenario-button rounded-lg"
              :variant="scenario.enabled ? 'default' : 'outline'"
              :disabled="!scenario.enabled"
              @click="runScenario(scenario)"
            >
              <Play class="size-3.5" />
              {{ scenario.enabled ? t('scenarios.run') : t('scenarios.soon') }}
            </Button>
          </div>
        </article>
      </div>
    </CardContent>
  </Card>
</template>

<style scoped>
.surface-card {
  gap: 0;
  border-color: var(--border);
  background: var(--card);
  padding-block: 0;
  box-shadow: 0 12px 32px hsl(0 0% 0% / 0.045);
}

.scenario-header {
  padding: 1.5rem 1.5rem 0.75rem;
}

.scenario-section-title {
  font-size: 1.125rem;
  font-weight: 600;
  line-height: 1.5rem;
}

.scenario-section-description {
  max-width: 46rem;
  color: var(--muted-foreground);
  font-size: 0.875rem;
  line-height: 1.35rem;
}

.scenario-content {
  padding: 0.75rem 1.5rem 1.5rem;
}

.scenario-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 22rem), 1fr));
  gap: 0.75rem;
}

.scenario-card {
  display: grid;
  min-width: 0;
  grid-template-columns: minmax(0, 1fr);
  grid-template-rows: minmax(0, 1fr) auto;
  align-items: flex-start;
  gap: 1rem;
  border: 1px solid var(--border);
  border-radius: 0.75rem;
  background: var(--background);
  padding: 1rem;
  box-shadow: none;
}

.scenario-card--disabled {
  background: var(--muted);
}

.scenario-card h3 {
  font-size: 1rem;
  font-weight: 700;
  line-height: 1.35rem;
  color: var(--foreground);
}

.scenario-description {
  display: -webkit-box;
  margin-top: 0.375rem;
  overflow: hidden;
  color: var(--muted-foreground);
  font-size: 0.8125rem;
  line-height: 1.15rem;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.scenario-icon {
  display: inline-flex;
  width: 2rem;
  height: 2rem;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  border-radius: 0.625rem;
  border: 1px solid var(--border);
  background: var(--card);
  color: hsl(208 78% 45%);
  box-shadow: none;
}

.scenario-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-start;
  gap: 0.5rem;
}

.scenario-button {
  height: 2.25rem;
  min-width: 0;
}

.scenario-card:nth-child(2) .scenario-icon {
  color: hsl(18 90% 52%);
}

.scenario-card:nth-child(3) .scenario-icon {
  color: hsl(31 92% 50%);
}

.scenario-card:nth-child(4) .scenario-icon {
  color: hsl(135 50% 36%);
}

.scenario-card:nth-child(5) .scenario-icon {
  color: hsl(262 64% 54%);
}

.scenario-card:nth-child(6) .scenario-icon {
  color: hsl(220 70% 48%);
}

.scenario-card:nth-child(7) .scenario-icon {
  color: hsl(292 56% 48%);
}

.scenario-card:nth-child(8) .scenario-icon {
  color: hsl(188 72% 38%);
}

.scenario-card:nth-child(9) .scenario-icon {
  color: hsl(345 72% 48%);
}

@media (max-width: 640px) {
  .scenario-header {
    padding: 1rem 1rem 0.625rem;
  }

  .scenario-content {
    padding: 0.625rem 1rem 1rem;
  }

  .scenario-card {
    grid-template-columns: 1fr;
    gap: 0.875rem;
    padding: 0.875rem;
  }

  .scenario-card h3 {
    font-size: 0.9375rem;
    line-height: 1.25rem;
  }

  .scenario-description {
    -webkit-line-clamp: 3;
  }

  .scenario-actions {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .scenario-button {
    width: 100%;
    padding-inline: 0.625rem;
  }
}

@media (max-width: 360px) {
  .scenario-actions {
    grid-template-columns: 1fr;
  }
}
</style>
