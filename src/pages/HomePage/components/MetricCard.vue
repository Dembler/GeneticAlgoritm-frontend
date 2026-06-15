<script setup lang="ts">
import { Card, CardContent } from '@/shared/ui'

defineProps<{
  label: string
  value: string
  detail?: string
  accent?: 'blue' | 'emerald' | 'amber' | 'violet'
}>()
</script>

<template>
  <Card class="metric-card overflow-hidden" :class="accent && `metric-card--${accent}`">
    <CardContent class="flex h-full flex-col gap-3 p-4">
      <div class="flex items-start justify-between gap-3">
        <span class="metric-card__label text-xs font-medium uppercase">{{ label }}</span>
      </div>
      <strong class="metric-card__value text-2xl font-semibold leading-tight">{{ value }}</strong>
      <span v-if="detail" class="text-xs leading-5 text-muted-foreground">{{ detail }}</span>
    </CardContent>
  </Card>
</template>

<style scoped>
.metric-card {
  --metric-accent: var(--chart-1);
  position: relative;
  border-color: color-mix(in oklch, var(--metric-accent) 32%, var(--border));
  background:
    linear-gradient(180deg, color-mix(in oklch, var(--metric-accent) 8%, var(--card)), var(--card) 64%);
  box-shadow: 0 14px 32px hsl(0 0% 0% / 0.055);
}

.metric-card::before {
  content: '';
  position: absolute;
  inset: 0 0 auto;
  height: 3px;
  background: var(--metric-accent);
}

.metric-card__label {
  color: color-mix(in oklch, var(--metric-accent) 62%, var(--muted-foreground));
}

.metric-card__value {
  color: var(--foreground);
}

.metric-card--blue {
  --metric-accent: var(--chart-1);
}

.metric-card--emerald {
  --metric-accent: var(--chart-2);
}

.metric-card--amber {
  --metric-accent: var(--chart-3);
}

.metric-card--violet {
  --metric-accent: var(--chart-4);
}

:global(.dark) .metric-card {
  box-shadow: 0 14px 34px hsl(0 0% 0% / 0.24);
}
</style>
