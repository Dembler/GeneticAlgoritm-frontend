<script setup lang="ts">
import { computed } from 'vue'

import { Skeleton } from '@/shared/ui'
import type { RouteResponse } from '@/shared/api/route.types'
import { formatDuration, formatMoney, formatNumber } from '@/shared/lib/format/number'

import MetricCard from './MetricCard.vue'

const props = defineProps<{
  result: RouteResponse | null
  loading: boolean
}>()

type MetricCardItem = {
  label: string
  value: string
  detail?: string
  tone?: 'default' | 'positive' | 'negative'
}

const metrics = computed(
  () => props.result?.metrics ?? props.result?.comparison?.optimized_metrics ?? null,
)
const currency = computed(
  () => props.result?.operational_cost?.currency ?? props.result?.fuel_cost?.currency ?? 'RUB',
)

const cards = computed<MetricCardItem[]>(() => {
  const current = metrics.value

  if (!current) {
    return []
  }

  const averageSpeed =
    current.duration_min > 0 ? current.distance_km / (current.duration_min / 60) : null

  return [
    {
      label: 'Дистанция',
      value: `${formatNumber(current.distance_km, 1)} км`,
    },
    {
      label: 'Время',
      value: formatDuration(current.duration_min),
      detail: averageSpeed ? `${formatNumber(averageSpeed, 1)} км/ч средняя` : undefined,
    },
    {
      label: 'Стоимость',
      value: formatMoney(
        props.result?.operational_cost?.total_cost ?? current.operational_cost,
        currency.value,
        true,
      ),
      detail: 'топливо и эксплуатация',
    },
    {
      label: 'Топливо',
      value: `${formatNumber(current.fuel_liters, 1)} л`,
      detail: formatMoney(
        props.result?.fuel_cost?.total_cost ?? current.fuel_cost,
        currency.value,
        true,
      ),
    },
  ]
})
</script>

<template>
  <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
    <template v-if="loading">
      <Skeleton v-for="index in 4" :key="index" class="h-32 rounded-lg" />
    </template>
    <template v-else-if="cards.length">
      <MetricCard
        v-for="card in cards"
        :key="card.label"
        :label="card.label"
        :value="card.value"
        :detail="card.detail"
        :tone="card.tone"
      />
    </template>
  </div>
</template>
