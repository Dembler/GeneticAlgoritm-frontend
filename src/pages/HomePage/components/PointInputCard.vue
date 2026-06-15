<script setup lang="ts">
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { ArrowDown, ArrowUp, Loader2, Search, Trash2 } from 'lucide-vue-next'

import { Badge, Button, Input, Label } from '@/shared/ui'
import type { Point } from '@/shared/api/route.types'

import { useAddressSearch, type AddressSuggestion } from '../model/useAddressSearch'

const props = defineProps<{
  point: Point
  index: number
  canRemove: boolean
  canMoveUp: boolean
  canMoveDown: boolean
}>()

const emit = defineEmits<{
  update: [point: Point]
  remove: []
  'move-up': []
  'move-down': []
}>()

const { t } = useI18n({ useScope: 'global' })
const query = ref(props.point.label ?? '')
const { suggestions, loading, error, searchAddress, clearSuggestions } = useAddressSearch()
const maxPointLabelLength = 64

function normalizePointLabel(value: string) {
  const trimmedValue = value.trim()

  if (!trimmedValue) {
    return null
  }

  return trimmedValue.slice(0, maxPointLabelLength)
}

watch(
  () => props.point.label,
  (label) => {
    query.value = label ?? ''
  },
)

function updatePoint(patch: Partial<Point>) {
  emit('update', {
    ...props.point,
    ...patch,
  })
}

function updateAddress(value: string) {
  query.value = value
  updatePoint({ label: normalizePointLabel(value) })
  void searchAddress(value)
}

function selectSuggestion(suggestion: AddressSuggestion) {
  const normalizedLabel = normalizePointLabel(suggestion.label)

  query.value = normalizedLabel ?? ''
  updatePoint({
    label: normalizedLabel,
    lat: Number(suggestion.lat.toFixed(6)),
    lon: Number(suggestion.lon.toFixed(6)),
  })
  clearSuggestions()
}

function numberFromEvent(event: Event, fallback: number) {
  const value = Number((event.target as HTMLInputElement).value)

  return Number.isFinite(value) ? value : fallback
}
</script>

<template>
  <div class="grid gap-3 rounded-xl border bg-card/90 p-3 text-sm shadow-sm">
    <div class="flex items-center justify-between gap-3">
      <Badge variant="secondary">{{ t('pointInput.pointNumber', { number: index + 1 }) }}</Badge>

      <div class="flex shrink-0 items-center gap-1">
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          :disabled="!canMoveUp"
          :aria-label="t('pointInput.moveUp')"
          @click="emit('move-up')"
        >
          <ArrowUp class="size-3.5" />
          <span class="sr-only">{{ t('pointInput.moveUp') }}</span>
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          :disabled="!canMoveDown"
          :aria-label="t('pointInput.moveDown')"
          @click="emit('move-down')"
        >
          <ArrowDown class="size-3.5" />
          <span class="sr-only">{{ t('pointInput.moveDown') }}</span>
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          :disabled="!canRemove"
          :aria-label="t('pointInput.delete')"
          @click="emit('remove')"
        >
          <Trash2 class="size-3.5" />
          <span class="sr-only">{{ t('pointInput.delete') }}</span>
        </Button>
      </div>
    </div>

    <div class="relative grid gap-2">
      <Label class="text-xs text-muted-foreground">{{ t('pointInput.address') }}</Label>
      <div class="relative">
        <Search
          class="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
        />
        <Input
          :value="query"
          class="h-9 pl-9"
          :placeholder="t('pointInput.addressPlaceholder')"
          @input="updateAddress(($event.target as HTMLInputElement).value)"
        />
        <Loader2
          v-if="loading"
          class="absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-muted-foreground"
        />
      </div>

      <div
        v-if="suggestions.length || error"
        class="absolute left-0 right-0 top-full z-[620] mt-1 overflow-hidden rounded-lg border bg-popover text-popover-foreground shadow-lg"
      >
        <button
          v-for="suggestion in suggestions"
          :key="suggestion.id"
          type="button"
          class="block w-full px-3 py-2 text-left text-xs leading-5 hover:bg-accent hover:text-accent-foreground"
          @click="selectSuggestion(suggestion)"
        >
          {{ suggestion.label }}
        </button>
        <p v-if="error" class="px-3 py-2 text-xs text-destructive">{{ error }}</p>
      </div>
    </div>

    <div class="grid grid-cols-2 gap-2">
      <div class="grid gap-2">
        <Label class="text-xs text-muted-foreground">{{ t('pointInput.latitude') }}</Label>
        <Input
          :value="point.lat"
          class="h-9"
          type="number"
          step="0.000001"
          placeholder="55.7558"
          @input="updatePoint({ lat: numberFromEvent($event, point.lat) })"
        />
      </div>
      <div class="grid gap-2">
        <Label class="text-xs text-muted-foreground">{{ t('pointInput.longitude') }}</Label>
        <Input
          :value="point.lon"
          class="h-9"
          type="number"
          step="0.000001"
          placeholder="37.6173"
          @input="updatePoint({ lon: numberFromEvent($event, point.lon) })"
        />
      </div>
    </div>
  </div>
</template>
