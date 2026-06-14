<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from 'vue'
import {
  BarChart3,
  CalendarClock,
  CheckCircle2,
  Code2,
  MapPin,
  Play,
  Plus,
  RefreshCw,
  SlidersHorizontal,
} from 'lucide-vue-next'

import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
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
} from '@/shared/ui'
import type { Point, RouteRequest, RouteResponse } from '@/shared/api/route.types'
import { formatDuration, formatMoney, formatNumber } from '@/shared/lib/format/number'
import { formatDataSource, hasFallbackSource } from '@/shared/lib/format/routePresentation'

import { priorityOptions, profileLabels, strategyLabels, vehicleLabels } from '../model/labels'
import DemoScenariosPanel from './DemoScenariosPanel.vue'
import InteractiveRouteMap from './InteractiveRouteMap.vue'
import MetricsDashboard from './MetricsDashboard.vue'
import PointInputCard from './PointInputCard.vue'
import RequestWorkbench from './RequestWorkbench.vue'
import RouteDecisionPanel from './RouteDecisionPanel.vue'
import RouteFactorsPanel from './RouteFactorsPanel.vue'

const draft = defineModel<RouteRequest | null>('draft', { required: true })
const jsonValue = defineModel<string>('jsonValue', { required: true })
const jsonError = defineModel<string | null>('jsonError', { required: true })
const selectedAlternativeRank = defineModel<number | null>('selectedAlternativeRank', {
  required: true,
})

const props = defineProps<{
  result: RouteResponse | null
  running: boolean
  canRun: boolean
  error?: string | null
}>()

const emit = defineEmits<{
  run: []
  syncJson: []
  applyJson: []
  resetDraft: []
  openAnalysis: []
  applyScenario: [draft: RouteRequest]
  runScenario: [draft: RouteRequest]
}>()

const coordinatesOpen = ref(false)
const settingsOpen = ref(false)
const elapsedSeconds = ref(0)
let elapsedTimer: ReturnType<typeof setInterval> | null = null

const profileOptions = Object.entries(profileLabels)
const vehicleOptions = Object.entries(vehicleLabels)
const strategyOptions = Object.entries(strategyLabels)

const dateFormatter = new Intl.DateTimeFormat('ru-RU', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
})

const metrics = computed(
  () => props.result?.metrics ?? props.result?.comparison?.optimized_metrics ?? null,
)
const currency = computed(
  () => props.result?.operational_cost?.currency ?? props.result?.fuel_cost?.currency ?? 'RUB',
)
const dataSource = computed(() => props.result?.data_sources?.routing ?? props.result?.provider)
const runId = computed(() => props.result?.run_id ?? 'текущий')
const pointCount = computed(() => draft.value?.points.length ?? 0)
const launchDate = computed(() => {
  const rawDate = draft.value?.departure_at
  const date = rawDate ? new Date(rawDate) : new Date()

  return Number.isNaN(date.getTime()) ? rawDate : dateFormatter.format(date)
})
const sourceWarning = computed(() =>
  hasFallbackSource(dataSource.value) ? 'Часть данных рассчитана приближенно' : null,
)
const elapsedTimeLabel = computed(() => {
  const minutes = Math.floor(elapsedSeconds.value / 60)
  const seconds = elapsedSeconds.value % 60

  if (!minutes) {
    return `${seconds} сек.`
  }

  return `${minutes} мин. ${seconds.toString().padStart(2, '0')} сек.`
})
const calculationStatus = computed(() => {
  if (elapsedSeconds.value < 5) {
    return 'Подготавливаем данные маршрута'
  }

  if (elapsedSeconds.value < 20) {
    return 'Запрашиваем дорожные данные'
  }

  if (elapsedSeconds.value < 60) {
    return 'Оптимизируем порядок точек'
  }

  return 'Расчет продолжается, сервис все еще отвечает'
})

const resultRows = computed(() => {
  const current = metrics.value

  if (!current) {
    return []
  }

  return [
    { label: 'Расстояние', value: `${formatNumber(current.distance_km, 0)} км` },
    { label: 'Время в пути', value: formatDuration(current.duration_min) },
    {
      label: 'Стоимость',
      value: formatMoney(current.operational_cost || current.fuel_cost, currency.value, true),
    },
    { label: 'Топливо', value: `${formatNumber(current.fuel_liters, 1)} л` },
  ]
})

function addPoint() {
  if (!draft.value) {
    return
  }

  const pointIndex = draft.value.points.length
  const previousPoint = draft.value.points[pointIndex - 1]

  draft.value.points.push({
    label: `Точка ${pointIndex + 1}`,
    lat: Number(((previousPoint?.lat ?? 55.7558) + 0.08).toFixed(6)),
    lon: Number(((previousPoint?.lon ?? 37.6173) + 0.08).toFixed(6)),
  })
}

function updatePoint(index: number, point: Point) {
  if (!draft.value?.points[index]) {
    return
  }

  draft.value.points[index] = point
}

function removePoint(index: number) {
  if (!draft.value) {
    return
  }

  draft.value.points.splice(index, 1)
}

function nullableStringValue(event: Event) {
  const value = (event.target as HTMLInputElement).value.trim()

  return value ? value : null
}

function nullableNumberValue(event: Event) {
  const value = (event.target as HTMLInputElement).value

  if (value === '') {
    return null
  }

  const numberValue = Number(value)

  return Number.isFinite(numberValue) ? numberValue : null
}

function requiredNumberValue(event: Event, fallback: number) {
  return nullableNumberValue(event) ?? fallback
}

watch(
  () => props.running,
  (isRunning) => {
    if (elapsedTimer) {
      clearInterval(elapsedTimer)
      elapsedTimer = null
    }

    if (!isRunning) {
      elapsedSeconds.value = 0
      return
    }

    elapsedSeconds.value = 0
    elapsedTimer = setInterval(() => {
      elapsedSeconds.value += 1
    }, 1000)
  },
  { immediate: true },
)

onUnmounted(() => {
  if (elapsedTimer) {
    clearInterval(elapsedTimer)
  }
})
</script>

<template>
  <div class="flex min-w-0 flex-col gap-5" :inert="running">
    <header class="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <div class="flex min-w-0 flex-col gap-1">
        <div class="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <Badge variant="outline">Текущая задача</Badge>
          <span>{{ pointCount }} точек</span>
          <Badge v-if="result" variant="secondary">Результат готов</Badge>
        </div>
        <h1 class="text-xl font-semibold tracking-normal text-foreground">Построение маршрута</h1>
      </div>

      <div class="flex flex-wrap items-center gap-2">
        <Button variant="outline" class="rounded-xl" @click="coordinatesOpen = true">
          <MapPin class="size-4" />
          Задать координаты
        </Button>
        <Button
          variant="outline"
          class="rounded-xl"
          :disabled="!result"
          @click="emit('openAnalysis')"
        >
          <BarChart3 class="size-4" />
          Анализ текущего запуска
        </Button>
        <Button :disabled="!canRun" class="rounded-xl" @click="emit('run')">
          <RefreshCw v-if="running" class="size-4 animate-spin" />
          <Play v-else class="size-4" />
          {{ running ? 'Расчет...' : 'Провести расчет' }}
        </Button>
      </div>
    </header>

    <p
      v-if="error"
      class="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive"
    >
      {{ error }}
    </p>

    <section class="route-stage">
      <InteractiveRouteMap
        v-model:draft="draft"
        :result="result"
        :selected-alternative-rank="selectedAlternativeRank"
      />
    </section>

    <MetricsDashboard v-if="result || running" :result="result" :loading="running" />

    <RouteFactorsPanel :result="result" />

    <RouteDecisionPanel v-if="result" :result="result" />

    <Card v-if="result" class="overflow-hidden">
      <CardContent class="grid gap-4 p-4 lg:grid-cols-[minmax(0,1fr)_auto]">
        <div class="min-w-0">
          <div class="mb-3 flex flex-wrap items-center gap-2">
            <h2 class="text-base font-semibold text-foreground">Результат оптимизации</h2>
            <Badge variant="secondary" class="gap-1.5">
              <CheckCircle2 class="size-3.5" />
              Готово
            </Badge>
          </div>

          <div class="grid gap-3 text-sm sm:grid-cols-2 xl:grid-cols-3">
            <div>
              <p class="text-xs text-muted-foreground">Дата запуска</p>
              <p class="font-medium text-foreground">{{ launchDate }}</p>
            </div>
            <details v-if="result?.run_id" class="group">
              <summary class="cursor-pointer list-none text-xs font-medium text-muted-foreground">
                Технические данные
              </summary>
              <p class="mt-1 break-all font-medium text-foreground">{{ runId }}</p>
            </details>
          </div>
        </div>

        <div class="grid gap-2 sm:grid-cols-2 lg:min-w-[28rem]">
          <div
            v-for="row in resultRows"
            :key="row.label"
            class="flex items-center justify-between gap-3 rounded-lg border bg-background/70 px-3 py-2 text-sm"
          >
            <span class="text-muted-foreground">{{ row.label }}</span>
            <span class="font-semibold text-foreground">{{ row.value }}</span>
          </div>
        </div>

        <div class="rounded-lg border bg-primary/5 p-3 text-xs text-muted-foreground lg:col-span-2">
          <div class="mb-1 flex items-center gap-2 font-medium text-foreground">
            <CalendarClock class="size-3.5" />
            Источник данных
          </div>
          <span>{{ formatDataSource(dataSource ?? 'backend') }}</span>
          <span v-if="sourceWarning" class="ml-2 text-negative-foreground">
            {{ sourceWarning }}
          </span>
        </div>
      </CardContent>
    </Card>

    <DemoScenariosPanel
      @apply-scenario="emit('applyScenario', $event)"
      @run-scenario="emit('runScenario', $event)"
    />

    <Sheet v-model:open="coordinatesOpen">
      <SheetContent
        class="flex w-[94vw] max-w-[94vw] flex-col overflow-hidden sm:w-[46rem] sm:max-w-none"
      >
        <SheetHeader>
          <SheetTitle class="flex items-center gap-2">
            <MapPin class="size-4" />
            Задать координаты
          </SheetTitle>
          <SheetDescription>
            Введите адрес, координаты или добавьте точки кликом по карте. После ввода можно сразу
            запустить расчет.
          </SheetDescription>
        </SheetHeader>

        <div v-if="draft" class="min-h-0 flex-1 overflow-y-auto px-4">
          <Tabs default-value="route" class="grid gap-4 py-4">
            <div class="overflow-x-auto">
              <TabsList>
                <TabsTrigger value="route">Маршрут</TabsTrigger>
                <TabsTrigger value="vehicle">Транспорт</TabsTrigger>
                <TabsTrigger value="cargo">Дополнительно</TabsTrigger>
                <TabsTrigger value="constraints">Ограничения</TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="route" class="m-0 grid gap-4">
              <div class="grid gap-3 sm:grid-cols-2">
                <div class="grid gap-2">
                  <Label class="text-xs text-muted-foreground">Профиль маршрута</Label>
                  <Select v-model="draft.profile" aria-label="Профиль маршрута">
                    <SelectTrigger class="w-full bg-background">
                      <SelectValue placeholder="Выберите профиль" />
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

                <div class="grid gap-2">
                  <Label class="text-xs text-muted-foreground">Приоритет</Label>
                  <Select v-model="draft.priority_profile" aria-label="Приоритет маршрута">
                    <SelectTrigger class="w-full bg-background">
                      <SelectValue placeholder="Выберите приоритет" />
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

                <div class="grid gap-2 sm:col-span-2">
                  <Label class="text-xs text-muted-foreground">Стратегия оптимизации</Label>
                  <Select v-model="draft.optimization_strategy" aria-label="Стратегия оптимизации">
                    <SelectTrigger class="w-full bg-background">
                      <SelectValue placeholder="Выберите стратегию" />
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

                <div class="grid gap-2 sm:col-span-2">
                  <Label class="text-xs text-muted-foreground">Дата и время отправления</Label>
                  <Input
                    :value="draft.departure_at ?? ''"
                    class="h-9"
                    placeholder="2026-06-10T07:30:00+00:00"
                    @input="draft.departure_at = nullableStringValue($event)"
                  />
                </div>
              </div>

              <div class="grid gap-3 rounded-xl border bg-background/65 p-3">
                <div class="flex items-center justify-between gap-3">
                  <div>
                    <p class="text-xs font-medium text-foreground">Динамические веса</p>
                    <p class="text-xs text-muted-foreground">Контекстная адаптация весов</p>
                  </div>
                  <Switch v-model="draft.use_dynamic_weights" />
                </div>
                <div class="flex items-center justify-between gap-3">
                  <div>
                    <p class="text-xs font-medium text-foreground">Оптимизировать порядок</p>
                    <p class="text-xs text-muted-foreground">Алгоритм переставляет точки</p>
                  </div>
                  <Switch v-model="draft.optimize" />
                </div>
                <div class="flex items-center justify-between gap-3">
                  <div>
                    <p class="text-xs font-medium text-foreground">Фиксировать старт и финиш</p>
                    <p class="text-xs text-muted-foreground">
                      Первая и последняя точки остаются на местах
                    </p>
                  </div>
                  <Switch v-model="draft.fix_ends" />
                </div>
              </div>

              <section class="grid gap-3">
                <div class="flex items-center justify-between gap-3">
                  <div>
                    <h3 class="text-sm font-semibold text-foreground">Точки маршрута</h3>
                    <p class="text-xs text-muted-foreground">Нужно минимум две разные точки.</p>
                  </div>
                  <Button variant="outline" size="sm" class="h-8 rounded-lg" @click="addPoint">
                    <Plus class="size-3.5" />
                    Добавить
                  </Button>
                </div>

                <PointInputCard
                  v-for="(point, index) in draft.points"
                  :key="index"
                  :point="point"
                  :index="index"
                  :can-remove="draft.points.length > 0"
                  @update="updatePoint(index, $event)"
                  @remove="removePoint(index)"
                />
              </section>
            </TabsContent>

            <TabsContent value="vehicle" class="m-0 grid gap-4">
              <Card class="surface-card">
                <CardHeader class="pb-2">
                  <CardTitle class="text-sm">Параметры транспорта</CardTitle>
                </CardHeader>
                <CardContent class="grid gap-3 sm:grid-cols-2">
                  <div class="grid gap-2">
                    <Label class="text-xs text-muted-foreground">Класс транспорта</Label>
                    <Select v-model="draft.vehicle_class" aria-label="Класс транспорта">
                      <SelectTrigger class="w-full bg-background">
                        <SelectValue placeholder="Выберите транспорт" />
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
                  <div class="grid gap-2">
                    <Label class="text-xs text-muted-foreground">Расход, л/100 км</Label>
                    <Input
                      :value="draft.fuel_consumption_l_per_100km ?? ''"
                      class="h-9"
                      type="number"
                      min="0"
                      step="0.1"
                      @input="
                        draft.fuel_consumption_l_per_100km = requiredNumberValue(
                          $event,
                          draft.fuel_consumption_l_per_100km ?? 8,
                        )
                      "
                    />
                  </div>
                  <div class="grid gap-2">
                    <Label class="text-xs text-muted-foreground">Масса, т</Label>
                    <Input
                      :value="draft.vehicle_dimensions.weight_t ?? ''"
                      class="h-9"
                      type="number"
                      min="0"
                      step="0.1"
                      @input="draft.vehicle_dimensions.weight_t = nullableNumberValue($event)"
                    />
                  </div>
                  <div class="grid gap-2">
                    <Label class="text-xs text-muted-foreground">Высота, м</Label>
                    <Input
                      :value="draft.vehicle_dimensions.height_m ?? ''"
                      class="h-9"
                      type="number"
                      min="0"
                      step="0.1"
                      @input="draft.vehicle_dimensions.height_m = nullableNumberValue($event)"
                    />
                  </div>
                  <div class="grid gap-2">
                    <Label class="text-xs text-muted-foreground">Ширина, м</Label>
                    <Input
                      :value="draft.vehicle_dimensions.width_m ?? ''"
                      class="h-9"
                      type="number"
                      min="0"
                      step="0.1"
                      @input="draft.vehicle_dimensions.width_m = nullableNumberValue($event)"
                    />
                  </div>
                  <div class="grid gap-2">
                    <Label class="text-xs text-muted-foreground">Длина, м</Label>
                    <Input
                      :value="draft.vehicle_dimensions.length_m ?? ''"
                      class="h-9"
                      type="number"
                      min="0"
                      step="0.1"
                      @input="draft.vehicle_dimensions.length_m = nullableNumberValue($event)"
                    />
                  </div>
                  <div class="grid gap-2">
                    <Label class="text-xs text-muted-foreground">Грузоподъемность, т</Label>
                    <Input
                      :value="draft.vehicle_capacity_t ?? ''"
                      class="h-9"
                      type="number"
                      min="0"
                      step="0.1"
                      @input="draft.vehicle_capacity_t = nullableNumberValue($event)"
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="cargo" class="m-0 grid gap-4">
              <Card class="surface-card">
                <CardHeader class="pb-2">
                  <CardTitle class="text-sm">Многомашинная доставка (CVRP)</CardTitle>
                  <p class="text-xs leading-5 text-muted-foreground">
                    Специализированное разделение общего маршрута по нескольким машинам.
                  </p>
                </CardHeader>
                <CardContent class="grid gap-3 sm:grid-cols-2">
                  <div class="grid gap-2">
                    <Label class="text-xs text-muted-foreground">Масса груза, т</Label>
                    <Input
                      :value="draft.cargo.weight_t ?? ''"
                      class="h-9"
                      type="number"
                      min="0"
                      step="0.1"
                      @input="draft.cargo.weight_t = nullableNumberValue($event)"
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="constraints" class="m-0 grid gap-4">
              <Card class="surface-card">
                <CardHeader class="pb-2">
                  <CardTitle class="text-sm">Границы оптимизации</CardTitle>
                </CardHeader>
                <CardContent class="grid gap-3 sm:grid-cols-2">
                  <div class="grid gap-2">
                    <Label class="text-xs text-muted-foreground">Макс. расстояние, км</Label>
                    <Input
                      :value="draft.constraints.max_distance_km ?? ''"
                      class="h-9"
                      type="number"
                      min="0"
                      @input="draft.constraints.max_distance_km = nullableNumberValue($event)"
                    />
                  </div>
                  <div class="grid gap-2">
                    <Label class="text-xs text-muted-foreground">Макс. время, мин</Label>
                    <Input
                      :value="draft.constraints.max_duration_min ?? ''"
                      class="h-9"
                      type="number"
                      min="0"
                      @input="draft.constraints.max_duration_min = nullableNumberValue($event)"
                    />
                  </div>
                  <div class="grid gap-2">
                    <Label class="text-xs text-muted-foreground">Макс. стоимость</Label>
                    <Input
                      :value="draft.constraints.max_operational_cost ?? ''"
                      class="h-9"
                      type="number"
                      min="0"
                      @input="draft.constraints.max_operational_cost = nullableNumberValue($event)"
                    />
                  </div>
                  <div class="grid gap-2">
                    <Label class="text-xs text-muted-foreground">Макс. CO2, кг</Label>
                    <Input
                      :value="draft.constraints.max_co2_kg ?? ''"
                      class="h-9"
                      type="number"
                      min="0"
                      @input="draft.constraints.max_co2_kg = nullableNumberValue($event)"
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        <SheetFooter class="flex-row flex-wrap justify-between gap-2">
          <Button variant="outline" :disabled="running" @click="emit('resetDraft')">
            <RefreshCw class="size-4" />
            Очистить
          </Button>
          <div class="flex flex-wrap gap-2">
            <Button variant="outline" @click="settingsOpen = true">
              <SlidersHorizontal class="size-4" />
              Режим исследователя
            </Button>
            <Button :disabled="!canRun" @click="emit('run')">
              <RefreshCw v-if="running" class="size-4 animate-spin" />
              <Play v-else class="size-4" />
              {{ running ? 'Расчет...' : 'Провести расчет' }}
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>

    <Sheet v-model:open="settingsOpen">
      <SheetContent class="w-[94vw] max-w-[94vw] overflow-y-auto sm:w-[46rem] sm:max-w-none">
        <SheetHeader>
          <SheetTitle class="flex items-center gap-2">
            <Code2 class="size-4" />
            Режим исследователя
          </SheetTitle>
          <SheetDescription>
            Дополнительные веса, параметры алгоритма, CVRP и JSON-запрос к backend. По умолчанию эти
            технические данные скрыты из основного режима.
          </SheetDescription>
        </SheetHeader>
        <div class="px-4 pb-4">
          <RequestWorkbench
            v-model:draft="draft"
            v-model:json-value="jsonValue"
            v-model:json-error="jsonError"
            :running="running"
            :can-run="canRun"
            @run="emit('run')"
            @sync-json="emit('syncJson')"
            @apply-json="emit('applyJson')"
            @reset-draft="emit('resetDraft')"
          />
        </div>
      </SheetContent>
    </Sheet>
  </div>

  <Teleport to="body">
    <div
      v-if="running"
      class="fixed inset-0 z-50 grid place-items-center bg-black/55 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="route-calculation-title"
    >
      <Card
        class="w-[min(92vw,32rem)] overflow-hidden border-primary/30 bg-card text-card-foreground shadow-2xl"
      >
        <CardContent class="grid gap-5 p-6">
          <div class="flex items-start gap-3">
            <div
              class="flex size-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary"
            >
              <RefreshCw class="size-6 animate-spin" />
            </div>

            <div class="min-w-0">
              <Badge variant="secondary" class="mb-2 gap-1.5">
                <RefreshCw class="size-3 animate-spin" />
                Идет расчет
              </Badge>
              <h2 id="route-calculation-title" class="text-lg font-semibold text-foreground">
                Строим оптимальный маршрут
              </h2>
              <p class="mt-1 text-sm text-muted-foreground" aria-live="polite">
                {{ calculationStatus }}
              </p>
            </div>
          </div>

          <div class="grid gap-2">
            <div class="flex items-center justify-between gap-3 text-xs text-muted-foreground">
              <span>Прошло {{ elapsedTimeLabel }}</span>
              <span>{{ pointCount }} точек</span>
            </div>
            <div class="flex gap-1.5" aria-hidden="true">
              <span class="route-loading-dot" />
              <span class="route-loading-dot route-loading-dot-delay-1" />
              <span class="route-loading-dot route-loading-dot-delay-2" />
            </div>
          </div>

          <p class="text-sm text-muted-foreground">
            Алгоритм может занимать больше минуты на сложных маршрутах. Дождитесь результата,
            действия на экране временно заблокированы.
          </p>
        </CardContent>
      </Card>
    </div>
  </Teleport>
</template>

<style scoped>
.route-stage {
  position: relative;
  isolation: isolate;
  height: 46rem;
  min-height: 34rem;
  overflow: hidden;
  border: 1px solid var(--border);
  border-radius: 1.25rem;
  background: var(--card);
  box-shadow: 0 24px 70px hsl(0 0% 0% / 0.07);
  resize: vertical;
}

.route-stage :deep(.interactive-map-shell) {
  border-radius: inherit;
}

.surface-card {
  border-radius: 0.875rem;
  background: color-mix(in oklch, var(--card) 96%, var(--muted));
}

.route-loading-dot {
  width: 0.5rem;
  height: 0.5rem;
  border-radius: 9999px;
  background: var(--primary);
  animation: route-loading-dot 1.1s ease-in-out infinite;
}

.route-loading-dot-delay-1 {
  animation-delay: 0.15s;
}

.route-loading-dot-delay-2 {
  animation-delay: 0.3s;
}

@keyframes route-loading-dot {
  0%,
  100% {
    opacity: 0.35;
    transform: translateY(0);
  }

  50% {
    opacity: 1;
    transform: translateY(-0.25rem);
  }
}

@media (max-width: 1180px) {
  .route-stage {
    height: 32rem;
    min-height: 24rem;
    resize: none;
  }
}

@media (max-width: 640px) {
  .route-stage {
    height: auto;
    min-height: 0;
    overflow: visible;
    border-radius: 1rem;
    background: transparent;
    box-shadow: none;
  }
}
</style>
