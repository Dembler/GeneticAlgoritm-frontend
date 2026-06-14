<script setup lang="ts">
import { Badge, Card, CardContent } from '@/shared/ui'

defineProps<{
  label: string
  value: string
  detail?: string
  tone?: 'default' | 'positive' | 'negative'
}>()
</script>

<template>
  <Card class="overflow-hidden">
    <CardContent class="flex h-full flex-col gap-3 p-4">
      <div class="flex items-start justify-between gap-3">
        <span class="text-xs font-medium uppercase text-muted-foreground">{{ label }}</span>
        <Badge
          v-if="tone && tone !== 'default'"
          variant="outline"
          :class="tone === 'positive' ? 'text-positive-foreground' : 'text-negative-foreground'"
        >
          {{ tone === 'positive' ? 'Выполнено' : 'Внимание' }}
        </Badge>
      </div>
      <strong class="text-2xl font-semibold leading-tight text-foreground">{{ value }}</strong>
      <span v-if="detail" class="text-xs leading-5 text-muted-foreground">{{ detail }}</span>
    </CardContent>
  </Card>
</template>
