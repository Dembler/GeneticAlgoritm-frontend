<script setup lang="ts">
import { computed, ref } from 'vue'
import { Code2, Play, RefreshCw, SlidersHorizontal } from 'lucide-vue-next'

import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Label,
  ScrollArea,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Separator,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  Switch,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Textarea,
} from '@/shared/ui'
import type { RouteRequest } from '@/shared/api/route.types'

import {
  criteriaLabels,
  fuelLabels,
  optimizationModeLabels,
  priorityOptions,
  profileLabels,
  strategyLabels,
  vehicleLabels,
} from '../model/labels'
import WeightSlider from './WeightSlider.vue'

const draft = defineModel<RouteRequest | null>('draft', { required: true })
const jsonValue = defineModel<string>('jsonValue', { required: true })
const jsonError = defineModel<string | null>('jsonError', { required: true })

defineProps<{
  running: boolean
  canRun: boolean
}>()

const emit = defineEmits<{
  run: []
  syncJson: []
  applyJson: []
  resetDraft: []
}>()

const jsonOpen = ref(false)

const profileOptions = Object.entries(profileLabels)
const vehicleOptions = Object.entries(vehicleLabels)
const strategyOptions = Object.entries(strategyLabels)
const modeOptions = Object.entries(optimizationModeLabels)
const fuelOptions = Object.entries(fuelLabels)
const activeWeightKeys: Array<keyof RouteRequest['criteria_weights']> = [
  'distance',
  'duration',
  'operational_cost',
  'emissions',
]

const weightEntries = computed(() =>
  activeWeightKeys
    .map((key) => [key, draft.value?.criteria_weights[key] ?? 0] as const)
    .filter(
      ([key, value]) =>
        value > 0 || key !== 'emissions' || draft.value?.priority_profile === 'greenest',
    ),
)

function openJsonSheet() {
  emit('syncJson')
  jsonOpen.value = true
}

function updateWeight(key: string, value: number) {
  if (!draft.value) {
    return
  }

  draft.value.criteria_weights[key as keyof RouteRequest['criteria_weights']] = value
}

function stringValue(event: Event) {
  return (event.target as HTMLInputElement).value
}

function nullableStringValue(event: Event) {
  const value = stringValue(event).trim()

  return value ? value : null
}

function nullableNumberValue(event: Event) {
  const value = stringValue(event)

  if (value === '') {
    return null
  }

  const numberValue = Number(value)

  return Number.isFinite(numberValue) ? numberValue : null
}

function requiredNumberValue(event: Event, fallback: number) {
  return nullableNumberValue(event) ?? fallback
}
</script>

<template>
  <Card class="overflow-hidden">
    <CardHeader class="gap-3">
      <div class="flex items-start justify-between gap-3">
        <div class="min-w-0">
          <CardTitle class="flex items-center gap-2 text-base">
            <SlidersHorizontal data-icon="inline-start" />
            Режим исследователя
          </CardTitle>
          <CardDescription class="mt-1 leading-5">
            Технические параметры текущего запроса скрыты из обычного режима и доступны здесь.
          </CardDescription>
        </div>
        <Badge variant="outline">Дополнительно</Badge>
      </div>
      <div class="flex flex-wrap gap-2">
        <Button :disabled="!canRun" @click="emit('run')">
          <Play data-icon="inline-start" />
          {{ running ? 'Расчет...' : 'Запустить' }}
        </Button>
        <Button variant="outline" :disabled="running" @click="emit('resetDraft')">
          <RefreshCw data-icon="inline-start" />
          Очистить
        </Button>
        <Button variant="outline" :disabled="!draft" @click="openJsonSheet">
          <Code2 data-icon="inline-start" />
          JSON
        </Button>
      </div>
    </CardHeader>

    <CardContent v-if="draft" class="p-0">
      <Tabs default-value="base" class="gap-0">
        <div class="border-y bg-muted/40 px-4 py-2">
          <TabsList class="grid h-auto w-full grid-cols-3">
            <TabsTrigger value="base">Запрос</TabsTrigger>
            <TabsTrigger value="cargo">Транспорт</TabsTrigger>
            <TabsTrigger value="weights">Веса и алгоритм</TabsTrigger>
          </TabsList>
        </div>

        <ScrollArea class="h-[calc(100vh-23rem)] min-h-[24rem]">
          <TabsContent value="base" class="m-0 flex flex-col gap-5 p-4">
            <section class="grid gap-3 sm:grid-cols-2">
              <div class="flex items-center justify-between gap-3 rounded-md border p-3">
                <div class="min-w-0">
                  <Label class="text-sm">Оптимизация порядка</Label>
                  <p class="text-xs text-muted-foreground">Алгоритм переставляет точки маршрута</p>
                </div>
                <Switch v-model="draft.optimize" />
              </div>
              <div class="flex items-center justify-between gap-3 rounded-md border p-3">
                <div class="min-w-0">
                  <Label class="text-sm">Фиксировать старт и финиш</Label>
                  <p class="text-xs text-muted-foreground">
                    Первая и последняя точки остаются на местах
                  </p>
                </div>
                <Switch v-model="draft.fix_ends" />
              </div>
            </section>

            <section class="grid gap-3 sm:grid-cols-2">
              <div class="flex flex-col gap-2">
                <Label>Профиль</Label>
                <Select v-model="draft.profile" aria-label="Профиль маршрута">
                  <SelectTrigger class="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem
                      v-for="[value, label] in profileOptions"
                      :key="value"
                      :value="value"
                    >
                      {{ label }}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div class="flex flex-col gap-2">
                <Label>Приоритет</Label>
                <Select v-model="draft.priority_profile" aria-label="Приоритет">
                  <SelectTrigger class="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem
                      v-for="[value, label] in priorityOptions"
                      :key="value"
                      :value="value"
                    >
                      {{ label }}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div class="flex flex-col gap-2">
                <Label>Режим оптимизации</Label>
                <Select v-model="draft.optimize_mode" aria-label="Режим оптимизации">
                  <SelectTrigger class="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem v-for="[value, label] in modeOptions" :key="value" :value="value">
                      {{ label }}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div class="flex flex-col gap-2">
                <Label>Стратегия</Label>
                <Select v-model="draft.optimization_strategy" aria-label="Стратегия">
                  <SelectTrigger class="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem
                      v-for="[value, label] in strategyOptions"
                      :key="value"
                      :value="value"
                    >
                      {{ label }}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div class="flex flex-col gap-2 sm:col-span-2">
                <Label>Отправление</Label>
                <Input
                  :value="draft.departure_at ?? ''"
                  type="text"
                  placeholder="2026-06-10T07:30:00+00:00"
                  @input="draft.departure_at = nullableStringValue($event)"
                />
              </div>
            </section>

            <div class="flex items-center justify-between gap-3 rounded-md border p-3">
              <div class="min-w-0">
                <Label class="text-sm">Динамические веса</Label>
                <p class="text-xs text-muted-foreground">Контекстная адаптация весов</p>
              </div>
              <Switch v-model="draft.use_dynamic_weights" />
            </div>
          </TabsContent>

          <TabsContent value="cargo" class="m-0 flex flex-col gap-5 p-4">
            <section class="grid gap-3 sm:grid-cols-2">
              <div class="flex flex-col gap-2">
                <Label>Транспорт</Label>
                <Select v-model="draft.vehicle_class" aria-label="Транспорт">
                  <SelectTrigger class="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem
                      v-for="[value, label] in vehicleOptions"
                      :key="value"
                      :value="value"
                    >
                      {{ label }}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div class="flex flex-col gap-2">
                <Label>Топливо</Label>
                <Select v-model="draft.fuel_type" aria-label="Топливо">
                  <SelectTrigger class="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem v-for="[value, label] in fuelOptions" :key="value" :value="value">
                      {{ label }}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div class="flex flex-col gap-2">
                <Label>Масса груза, т</Label>
                <Input
                  :value="draft.cargo.weight_t ?? ''"
                  type="number"
                  min="0"
                  step="0.1"
                  @input="draft.cargo.weight_t = nullableNumberValue($event)"
                />
              </div>
              <div class="flex flex-col gap-2">
                <Label>Грузоподъемность, т</Label>
                <Input
                  :value="draft.vehicle_capacity_t ?? ''"
                  type="number"
                  min="0"
                  step="0.1"
                  @input="draft.vehicle_capacity_t = nullableNumberValue($event)"
                />
              </div>
              <div class="flex flex-col gap-2">
                <Label>Расход, л/100 км</Label>
                <Input
                  :value="draft.fuel_consumption_l_per_100km ?? ''"
                  type="number"
                  min="1"
                  step="0.1"
                  @input="draft.fuel_consumption_l_per_100km = nullableNumberValue($event)"
                />
              </div>
              <div class="flex flex-col gap-2">
                <Label>Стоимость водителя, руб/ч</Label>
                <Input
                  :value="draft.operating_costs.driver_cost_per_hour ?? ''"
                  type="number"
                  min="0"
                  step="50"
                  @input="draft.operating_costs.driver_cost_per_hour = nullableNumberValue($event)"
                />
              </div>
            </section>

            <Separator />

            <section class="grid gap-3 sm:grid-cols-2">
              <div class="flex flex-col gap-2">
                <Label>Количество машин CVRP</Label>
                <Input
                  :value="draft.cvrp.vehicle_count"
                  type="number"
                  min="1"
                  max="200"
                  step="1"
                  @input="
                    draft.cvrp.vehicle_count = requiredNumberValue($event, draft.cvrp.vehicle_count)
                  "
                />
              </div>
              <div class="flex flex-col gap-2">
                <Label>Индекс депо</Label>
                <Input
                  :value="draft.cvrp.depot_index"
                  type="number"
                  min="0"
                  step="1"
                  @input="
                    draft.cvrp.depot_index = requiredNumberValue($event, draft.cvrp.depot_index)
                  "
                />
              </div>
              <div
                class="flex items-center justify-between gap-3 rounded-md border p-3 sm:col-span-2"
              >
                <div class="min-w-0">
                  <Label class="text-sm">Возврат в депо</Label>
                  <p class="text-xs text-muted-foreground">
                    Используется для разделения маршрута по машинам.
                  </p>
                </div>
                <Switch v-model="draft.cvrp.return_to_depot" />
              </div>
            </section>
          </TabsContent>

          <TabsContent value="weights" class="m-0 flex flex-col gap-5 p-4">
            <section class="grid gap-4">
              <WeightSlider
                v-for="[key, value] in weightEntries"
                :key="key"
                :label="criteriaLabels[key] ?? key"
                :model-value="value"
                @update:model-value="updateWeight(key, $event)"
              />
            </section>

            <Separator />

            <section class="grid gap-3 sm:grid-cols-2">
              <div class="flex flex-col gap-2">
                <Label>Размер популяции</Label>
                <Input
                  :value="draft.population_size"
                  type="number"
                  min="24"
                  max="400"
                  step="1"
                  @input="
                    draft.population_size = requiredNumberValue($event, draft.population_size)
                  "
                />
              </div>
              <div class="flex flex-col gap-2">
                <Label>Число поколений</Label>
                <Input
                  :value="draft.generations"
                  type="number"
                  min="20"
                  max="800"
                  step="1"
                  @input="draft.generations = requiredNumberValue($event, draft.generations)"
                />
              </div>
              <div class="flex flex-col gap-2">
                <Label>Вероятность скрещивания</Label>
                <Input
                  :value="draft.crossover_rate"
                  type="number"
                  min="0.1"
                  max="1"
                  step="0.01"
                  @input="draft.crossover_rate = requiredNumberValue($event, draft.crossover_rate)"
                />
              </div>
              <div class="flex flex-col gap-2">
                <Label>Вероятность мутации</Label>
                <Input
                  :value="draft.mutation_rate"
                  type="number"
                  min="0.01"
                  max="0.9"
                  step="0.01"
                  @input="draft.mutation_rate = requiredNumberValue($event, draft.mutation_rate)"
                />
              </div>
              <div class="flex flex-col gap-2">
                <Label>Число альтернатив</Label>
                <Input
                  :value="draft.max_alternatives"
                  type="number"
                  min="1"
                  max="20"
                  step="1"
                  @input="
                    draft.max_alternatives = requiredNumberValue($event, draft.max_alternatives)
                  "
                />
              </div>
              <div class="flex flex-col gap-2">
                <Label>Зерно генератора</Label>
                <Input
                  :value="draft.random_seed ?? ''"
                  type="number"
                  min="0"
                  step="1"
                  @input="draft.random_seed = nullableNumberValue($event)"
                />
              </div>
            </section>
          </TabsContent>
        </ScrollArea>
      </Tabs>
    </CardContent>
    <CardContent v-else class="p-4 text-sm text-muted-foreground">
      Создайте запрос на главном экране.
    </CardContent>
  </Card>

  <Sheet v-model:open="jsonOpen">
    <SheetContent class="w-[92vw] max-w-[92vw] sm:w-[48rem] sm:max-w-none">
      <SheetHeader>
        <SheetTitle>JSON-запрос</SheetTitle>
        <SheetDescription>
          Точный запрос для POST /api/routes. Изменения применяются после валидации.
        </SheetDescription>
      </SheetHeader>
      <div class="min-h-0 flex-1 px-4">
        <Textarea
          v-model="jsonValue"
          class="h-[calc(100vh-14rem)] min-h-[28rem] resize-none font-mono text-xs leading-5"
        />
        <p v-if="jsonError" class="mt-2 text-sm text-destructive">{{ jsonError }}</p>
      </div>
      <SheetFooter class="flex-row justify-end gap-2">
        <Button variant="outline" @click="emit('syncJson')">Синхронизировать</Button>
        <Button @click="emit('applyJson')">Применить JSON</Button>
      </SheetFooter>
    </SheetContent>
  </Sheet>
</template>
