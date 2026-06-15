<script setup lang="ts">
import { computed } from 'vue'
import { Clock3, Fuel, Route, Scale, ShieldAlert, ShieldCheck } from 'lucide-vue-next'

import { Badge, Card, CardContent, CardHeader, CardTitle } from '@/shared/ui'
import type { RouteResponse } from '@/shared/api/route.types'
import { formatMoney, formatNumber, formatPercent } from '@/shared/lib/format/number'
import { formatImprovement, translateBackendText } from '@/shared/lib/format/routePresentation'

const props = defineProps<{
  result: RouteResponse
}>()

const metrics = computed(
  () => props.result.metrics ?? props.result.comparison?.optimized_metrics ?? null,
)
const comparisonImprovement = computed(() => props.result.comparison?.improvement_pct)
const decisionSummary = computed(() => props.result.comparison_summary)
const decisionExplanation = computed(() => props.result.decision_explanation)
const diagnostics = computed(() => props.result.diagnostics)
const baselineMetrics = computed(
  () =>
    props.result.comparison?.baseline_metrics ?? props.result.comparison_summary?.baseline?.metrics,
)
const currency = computed(
  () => props.result.operational_cost?.currency ?? props.result.fuel_cost?.currency ?? 'RUB',
)

const hasConstraints = computed(() => {
  const current = metrics.value
  return Boolean(
    current &&
    (!current.feasible ||
      current.constraint_penalty > 0 ||
      current.violated_constraints.length ||
      diagnostics.value?.forbidden_edges),
  )
})

const subtitle = computed(() => {
  if (decisionSummary.value?.main_reason || decisionExplanation.value?.main_reason) {
    return translateBackendText(
      decisionExplanation.value?.main_reason ?? decisionSummary.value?.main_reason ?? '',
    )
  }

  return 'Маршрут выбран, потому что он сокращает расстояние, время в пути и итоговую стоимость по сравнению с исходным порядком точек.'
})

const reasons = computed(() => {
  const improvement = comparisonImprovement.value ?? decisionSummary.value?.improvement_pct
  const items: Array<{ text: string; positive: boolean }> = []

  function pushImprovement(
    label: string,
    value: number | undefined,
    positiveText: string,
    negativeText: string,
  ) {
    if (value === undefined) {
      return
    }

    const positive = value >= 0

    items.push({
      text: `${label} ${positive ? positiveText : negativeText} на ${formatImprovement(Math.abs(value), 1)}`,
      positive,
    })
  }

  pushImprovement('Расстояние', improvement?.distance_km, 'меньше', 'больше')
  pushImprovement('Время в пути', improvement?.duration_min, 'меньше', 'больше')
  pushImprovement('Стоимость', improvement?.operational_cost, 'ниже', 'выше')
  pushImprovement('Выбросы CO2', improvement?.co2_kg, 'ниже', 'выше')

  if (!items.length) {
    items.push({
      text: 'Маршрут соответствует заданным ограничениям',
      positive: Boolean(metrics.value?.feasible ?? true),
    })
  }

  return items
})

function percentLowerIsBetter(
  baseline: number | null | undefined,
  current: number | null | undefined,
) {
  if (
    baseline === null ||
    baseline === undefined ||
    current === null ||
    current === undefined ||
    !Number.isFinite(baseline) ||
    !Number.isFinite(current) ||
    Math.abs(baseline) < 0.000001
  ) {
    return null
  }

  return ((baseline - current) / Math.abs(baseline)) * 100
}

function percentHigherIsBetter(
  baseline: number | null | undefined,
  current: number | null | undefined,
) {
  if (
    baseline === null ||
    baseline === undefined ||
    current === null ||
    current === undefined ||
    !Number.isFinite(baseline) ||
    !Number.isFinite(current) ||
    Math.abs(baseline) < 0.000001
  ) {
    return null
  }

  return ((current - baseline) / Math.abs(baseline)) * 100
}

function totalRiskScore(current: NonNullable<typeof metrics.value>) {
  return (
    current.safety_risk +
    current.weather_risk +
    current.cargo_risk +
    current.road_quality_risk +
    current.incident_risk +
    current.roadwork_risk +
    current.dynamic_event_risk
  )
}

function reliabilityScore(current: NonNullable<typeof metrics.value>) {
  return current.route_reliability_score ?? current.reliability_score
}

function contributionText(value: number | null, positiveWord: string, negativeWord: string) {
  if (value === null) {
    return null
  }

  if (Math.abs(value) < 0.05) {
    return 'без заметного изменения'
  }

  return `${value >= 0 ? positiveWord : negativeWord} на ${formatImprovement(Math.abs(value), 1)}`
}

const criterionContributions = computed(() => {
  const current = metrics.value
  const baseline = baselineMetrics.value

  if (!current) {
    return []
  }

  const fuelImprovement = percentLowerIsBetter(baseline?.fuel_liters, current.fuel_liters)
  const riskImprovement = baseline
    ? percentLowerIsBetter(totalRiskScore(baseline), totalRiskScore(current))
    : null
  const reliabilityImprovement = baseline
    ? percentHigherIsBetter(reliabilityScore(baseline), reliabilityScore(current))
    : null

  return [
    {
      label: 'Расстояние',
      value:
        contributionText(comparisonImprovement.value?.distance_km ?? null, 'короче', 'длиннее') ??
        `${formatNumber(current.distance_km, 1)} км`,
      detail: 'влияет на пробег и ресурс транспорта',
      positive: (comparisonImprovement.value?.distance_km ?? 0) >= 0,
      accent: 'blue',
      icon: Route,
    },
    {
      label: 'Время',
      value:
        contributionText(comparisonImprovement.value?.duration_min ?? null, 'быстрее', 'дольше') ??
        `${formatNumber(current.duration_min, 0)} мин`,
      detail: 'учитывает скорость, трафик и задержки',
      positive: (comparisonImprovement.value?.duration_min ?? 0) >= 0,
      accent: 'emerald',
      icon: Clock3,
    },
    {
      label: 'Стоимость',
      value:
        contributionText(
          comparisonImprovement.value?.operational_cost ?? null,
          'дешевле',
          'дороже',
        ) ?? formatMoney(current.operational_cost, currency.value, true),
      detail: 'топливо, водитель, обслуживание и платные дороги',
      positive: (comparisonImprovement.value?.operational_cost ?? 0) >= 0,
      accent: 'amber',
      icon: Scale,
    },
    {
      label: 'Топливо',
      value:
        contributionText(fuelImprovement, 'меньше расход', 'больше расход') ??
        `${formatNumber(current.fuel_liters, 1)} л`,
      detail: 'снижает расход и связанные выбросы',
      positive: (fuelImprovement ?? 0) >= 0,
      accent: 'violet',
      icon: Fuel,
    },
    {
      label: 'Риск',
      value:
        contributionText(riskImprovement, 'ниже риск', 'выше риск') ??
        `${formatNumber(totalRiskScore(current), 2)} индекс`,
      detail: 'дороги, погода, события и грузовые ограничения',
      positive: (riskImprovement ?? 0) >= 0 && current.feasible,
      accent: 'rose',
      icon: ShieldAlert,
    },
    {
      label: 'Надежность',
      value:
        contributionText(reliabilityImprovement, 'выше', 'ниже') ??
        `${formatPercent(reliabilityScore(current) * 100, 0)}`,
      detail: 'вероятность стабильного прохождения маршрута',
      positive: (reliabilityImprovement ?? 0) >= 0,
      accent: 'sky',
      icon: ShieldCheck,
    },
  ]
})
</script>

<template>
  <Card class="decision-card">
    <CardHeader class="decision-header">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <CardTitle class="text-base">Почему выбран этот маршрут</CardTitle>
        <div class="flex flex-wrap gap-2">
          <Badge
            v-if="diagnostics?.baseline_guard_applied || decisionSummary?.baseline_guard_applied"
            variant="outline"
          >
            Исходный порядок выбран
          </Badge>
          <Badge v-if="decisionExplanation?.compromise_accepted" variant="outline">
            Компромисс принят
          </Badge>
          <Badge v-if="hasConstraints" variant="destructive">Есть ограничения</Badge>
          <Badge v-if="metrics && !metrics.feasible" variant="destructive">Недопустимо</Badge>
        </div>
      </div>
    </CardHeader>
    <CardContent class="decision-content">
      <p class="mb-2 text-sm leading-6 text-muted-foreground">
        {{ subtitle }}
      </p>

      <div
        v-if="diagnostics?.baseline_guard_applied || decisionSummary?.baseline_guard_applied"
        class="mb-2 rounded-lg border bg-muted/40 p-3 text-sm leading-6 text-muted-foreground"
      >
        Оптимизатор не нашел вариант лучше исходного порядка точек. Для сохранения качества выбран
        исходный маршрут.
      </div>

      <div>
        <p class="mb-2 text-xs font-medium uppercase text-muted-foreground">Вклад критериев</p>
        <div class="criterion-grid">
          <div
            v-for="criterion in criterionContributions"
            :key="criterion.label"
            class="criterion-card"
            :class="[
              criterion.positive ? 'criterion-card--positive' : 'criterion-card--negative',
              `criterion-card--${criterion.accent}`,
            ]"
          >
            <div class="criterion-card__head">
              <span class="criterion-card__label">{{ criterion.label }}</span>
              <span class="criterion-card__icon">
                <component :is="criterion.icon" class="size-4" />
              </span>
            </div>
            <strong>{{ criterion.value }}</strong>
            <small>{{ criterion.detail }}</small>
          </div>
        </div>
      </div>
    </CardContent>
  </Card>
</template>

<style scoped>
.decision-card {
  background: var(--card);
  gap: 0;
  padding-block: 0;
  box-shadow: 0 8px 24px hsl(0 0% 0% / 0.04);
}

.decision-header {
  padding: 1rem 1.25rem 0.5rem;
}

.decision-content {
  padding: 0 1.25rem 1rem;
}

.criterion-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(13rem, 1fr));
  gap: 0.625rem;
}

.criterion-card {
  --criterion-accent: var(--chart-1);
  display: grid;
  position: relative;
  min-width: 0;
  overflow: hidden;
  gap: 0.375rem;
  border: 1px solid var(--border);
  border-radius: 0.625rem;
  background: var(--background);
  padding: 0.75rem 0.875rem;
}

.criterion-card__head {
  display: flex;
  min-width: 0;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
}

.criterion-card__label {
  color: var(--muted-foreground);
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
}

.criterion-card__icon {
  display: inline-flex;
  width: 1.75rem;
  height: 1.75rem;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--border);
  border-radius: 0.5rem;
  background: var(--card);
  color: color-mix(in oklch, var(--criterion-accent) 62%, var(--foreground));
}

.criterion-card strong {
  color: var(--foreground);
  font-size: 0.9375rem;
  line-height: 1.35;
}

.criterion-card small {
  color: var(--muted-foreground);
  font-size: 0.75rem;
  line-height: 1rem;
}

.criterion-card--positive {
  box-shadow: none;
}

.criterion-card--negative {
  box-shadow: none;
}

.criterion-card--blue {
  --criterion-accent: var(--chart-1);
}

.criterion-card--emerald {
  --criterion-accent: var(--chart-2);
}

.criterion-card--amber {
  --criterion-accent: var(--chart-3);
}

.criterion-card--violet {
  --criterion-accent: var(--chart-4);
}

.criterion-card--rose {
  --criterion-accent: var(--chart-5);
}

.criterion-card--sky {
  --criterion-accent: var(--chart-1);
}
</style>
