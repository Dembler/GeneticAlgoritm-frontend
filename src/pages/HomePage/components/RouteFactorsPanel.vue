<script setup lang="ts">
import {
  AlertTriangle,
  BadgeDollarSign,
  Boxes,
  Clock3,
  CloudSun,
  Gauge,
  Leaf,
  Route,
  Truck,
} from 'lucide-vue-next'

import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui'
import type { RouteResponse } from '@/shared/api/route.types'

defineProps<{
  result?: RouteResponse | null
}>()

const accountedFactors = [
  { label: 'Расстояние', icon: Route },
  { label: 'Время', icon: Clock3 },
  { label: 'Стоимость', icon: BadgeDollarSign },
  { label: 'Пробки', icon: Gauge },
  { label: 'Погода', icon: CloudSun },
  { label: 'Дорожные события', icon: AlertTriangle },
  { label: 'Ограничения транспорта', icon: Truck },
  { label: 'Многомашинная доставка', icon: Boxes },
  { label: 'CO2', icon: Leaf },
]
</script>

<template>
  <Card class="surface-card">
    <CardHeader class="pb-3">
      <CardTitle class="text-base">При расчете учитываются</CardTitle>
    </CardHeader>
    <CardContent>
      <section class="factor-grid">
        <div v-for="factor in accountedFactors" :key="factor.label" class="factor-chip">
          <component :is="factor.icon" class="size-4 text-primary" />
          <span>{{ factor.label }}</span>
        </div>
      </section>
    </CardContent>
  </Card>
</template>

<style scoped>
.surface-card {
  background: color-mix(in oklch, var(--card) 90%, transparent);
  box-shadow: 0 16px 45px hsl(0 0% 0% / 0.055);
  backdrop-filter: blur(12px);
}

.factor-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(10rem, 1fr));
  gap: 0.625rem;
}

.factor-chip {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 0.5rem;
  border: 1px solid var(--border);
  border-radius: 0.75rem;
  background: color-mix(in oklch, var(--background) 72%, transparent);
  padding: 0.625rem 0.75rem;
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--foreground);
}

.factor-chip span {
  min-width: 0;
  overflow-wrap: anywhere;
}
</style>
