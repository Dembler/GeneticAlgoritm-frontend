<script setup lang="ts">
import { useI18n } from 'vue-i18n'
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

const props = withDefaults(
  defineProps<{
    result?: RouteResponse | null
    layout?: 'grid' | 'vertical'
  }>(),
  {
    layout: 'grid',
  },
)

const { t } = useI18n({ useScope: 'global' })

const accountedFactors = [
  { labelKey: 'routeFactors.distance', icon: Route },
  { labelKey: 'routeFactors.duration', icon: Clock3 },
  { labelKey: 'routeFactors.cost', icon: BadgeDollarSign },
  { labelKey: 'routeFactors.congestion', icon: Gauge },
  { labelKey: 'routeFactors.weather', icon: CloudSun },
  { labelKey: 'routeFactors.roadEvents', icon: AlertTriangle },
  { labelKey: 'routeFactors.vehicleLimits', icon: Truck },
  { labelKey: 'routeFactors.cvrp', icon: Boxes },
  { labelKey: 'routeFactors.co2', icon: Leaf },
]
</script>

<template>
  <Card class="surface-card" :class="props.layout === 'vertical' && 'surface-card--vertical'">
    <CardHeader class="factor-header">
      <CardTitle class="factor-title">{{ t('routeFactors.title') }}</CardTitle>
    </CardHeader>
    <CardContent class="factor-content">
      <section class="factor-grid" :class="props.layout === 'vertical' && 'factor-grid--vertical'">
        <div v-for="factor in accountedFactors" :key="factor.labelKey" class="factor-chip">
          <component :is="factor.icon" class="factor-icon size-4" />
          <span>{{ t(factor.labelKey) }}</span>
        </div>
      </section>
    </CardContent>
  </Card>
</template>

<style scoped>
.surface-card {
  gap: 0;
  border-color: var(--border);
  background: var(--card);
  padding-block: 0;
  box-shadow: 0 10px 24px hsl(0 0% 0% / 0.035);
}

.surface-card--vertical {
  height: auto;
}

.factor-header {
  padding: 1rem 1rem 0.75rem;
}

.factor-title {
  font-size: 1rem;
  font-weight: 600;
  line-height: 1.35rem;
}

.factor-content {
  padding: 0 1rem 1rem;
}

.factor-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(10rem, 1fr));
  gap: 0.5rem;
}

.factor-grid--vertical {
  grid-template-columns: 1fr;
  align-content: start;
}

.factor-chip {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 0.45rem;
  min-height: 2rem;
  border: 1px solid hsl(0 0% 0% / 0.12);
  border-radius: 0.5rem;
  background: var(--background);
  padding: 0.375rem 0.5rem;
  font-size: 0.8125rem;
  font-weight: 600;
  line-height: 1.05rem;
  color: var(--foreground);
  box-shadow: none;
}

.factor-icon {
  flex-shrink: 0;
  color: hsl(208 78% 45%);
}

.factor-chip span {
  min-width: 0;
  overflow-wrap: anywhere;
}

.factor-chip:nth-child(2) .factor-icon {
  color: hsl(152 58% 36%);
}

.factor-chip:nth-child(3) .factor-icon {
  color: hsl(31 92% 50%);
}

.factor-chip:nth-child(4) .factor-icon {
  color: hsl(262 64% 54%);
}

.factor-chip:nth-child(5) .factor-icon {
  color: hsl(188 72% 38%);
}

.factor-chip:nth-child(6) .factor-icon {
  color: hsl(18 90% 52%);
}

.factor-chip:nth-child(7) .factor-icon {
  color: hsl(220 70% 48%);
}

.factor-chip:nth-child(8) .factor-icon {
  color: hsl(292 56% 48%);
}

.factor-chip:nth-child(9) .factor-icon {
  color: hsl(135 50% 36%);
}
</style>
