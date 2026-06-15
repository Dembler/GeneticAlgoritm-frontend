<script setup lang="ts">
import type { Component } from 'vue'

import { Card, CardContent } from '@/shared/ui'

defineProps<{
  label: string
  value: string
  detail?: string
  accent?: 'blue' | 'emerald' | 'amber' | 'violet'
  icon?: Component
}>()
</script>

<template>
  <Card class="metric-card overflow-hidden" :class="accent && `metric-card--${accent}`">
    <CardContent class="flex h-full flex-col gap-3 p-4">
      <div class="flex items-start justify-between gap-3">
        <span class="metric-card__label text-xs font-medium uppercase">{{ label }}</span>
        <span v-if="icon" class="metric-card__icon">
          <component :is="icon" class="size-4" />
        </span>
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
  border-color: var(--border);
  background: var(--card);
  padding-block: 0;
  box-shadow: 0 8px 20px hsl(0 0% 0% / 0.035);
}

.metric-card__label {
  color: var(--muted-foreground);
}

.metric-card__icon {
  display: inline-flex;
  width: 1.875rem;
  height: 1.875rem;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--border);
  border-radius: 0.5rem;
  background: var(--background);
  color: color-mix(in oklch, var(--metric-accent) 58%, var(--foreground));
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
