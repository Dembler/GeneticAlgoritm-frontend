<script setup lang="ts">
import { computed } from 'vue'
import { CheckCircle2, XCircle } from 'lucide-vue-next'

import { Badge, Card, CardContent, CardHeader, CardTitle } from '@/shared/ui'
import type { RouteResponse } from '@/shared/api/route.types'
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
</script>

<template>
  <Card class="decision-card">
    <CardHeader class="pb-3">
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
    <CardContent>
      <p class="mb-3 text-sm leading-6 text-muted-foreground">
        {{ subtitle }}
      </p>

      <div
        v-if="diagnostics?.baseline_guard_applied || decisionSummary?.baseline_guard_applied"
        class="mb-3 rounded-lg border bg-muted/40 p-3 text-sm leading-6 text-muted-foreground"
      >
        Оптимизатор не нашел вариант лучше исходного порядка точек. Для сохранения качества выбран
        исходный маршрут.
      </div>

      <div class="decision-grid">
        <div v-for="reason in reasons" :key="reason.text" class="decision-row">
          <component :is="reason.positive ? CheckCircle2 : XCircle" class="size-4" />
          <span class="min-w-0">{{ reason.text }}</span>
        </div>
      </div>
    </CardContent>
  </Card>
</template>

<style scoped>
.decision-card {
  background: color-mix(in oklch, var(--card) 92%, transparent);
  box-shadow: 0 16px 45px hsl(0 0% 0% / 0.055);
  backdrop-filter: blur(12px);
}

.decision-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(17rem, 1fr));
  gap: 0.625rem;
}

.decision-row {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  align-items: center;
  gap: 0.625rem;
  border: 1px solid var(--border);
  border-radius: 0.75rem;
  background: color-mix(in oklch, var(--background) 70%, transparent);
  padding: 0.75rem;
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--foreground);
}
</style>
