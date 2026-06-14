<script setup lang="ts">
import { computed } from 'vue'

import { Label, Slider } from '@/shared/ui'
import { formatNumber } from '@/shared/lib/format/number'

const props = defineProps<{
  label: string
  modelValue: number
}>()

const emit = defineEmits<{
  'update:modelValue': [value: number]
}>()

const sliderValue = computed({
  get: () => [props.modelValue],
  set: (value: number[]) => emit('update:modelValue', value[0] ?? 0),
})
</script>

<template>
  <div class="flex flex-col gap-2">
    <div class="flex items-center justify-between gap-3">
      <Label class="text-xs text-muted-foreground">{{ label }}</Label>
      <span class="font-mono text-xs text-foreground">{{ formatNumber(modelValue, 1) }}</span>
    </div>
    <Slider v-model="sliderValue" :min="0" :max="2" :step="0.1" />
  </div>
</template>
