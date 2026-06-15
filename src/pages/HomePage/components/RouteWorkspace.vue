<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
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
  toast,
} from '@/shared/ui'
import type { Point, RouteRequest, RouteResponse } from '@/shared/api/route.types'
import { formatMoney, formatNumber } from '@/shared/lib/format/number'
import { formatDataSource, hasFallbackSource } from '@/shared/lib/format/routePresentation'

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

const { t } = useI18n({ useScope: 'global' })
const coordinatesOpen = ref(false)
const settingsOpen = ref(false)
const elapsedSeconds = ref(0)
let elapsedTimer: ReturnType<typeof setInterval> | null = null

const profileValues = ['driving', 'walking', 'cycling'] as const
const vehicleValues = ['passenger', 'light_truck', 'heavy_truck'] as const
const priorityValues = ['balanced', 'fastest', 'cheapest', 'greenest'] as const

const dateFormatter = computed(
  () =>
    new Intl.DateTimeFormat('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }),
)

const profileOptions = computed(() =>
  profileValues.map((value) => [value, t(`route.options.profiles.${value}`)] as const),
)
const vehicleOptions = computed(() =>
  vehicleValues.map((value) => [value, t(`route.options.vehicles.${value}`)] as const),
)
const priorityOptions = computed(() =>
  priorityValues.map((value) => [value, t(`route.options.priority.${value}`)] as const),
)

const metrics = computed(
  () => props.result?.metrics ?? props.result?.comparison?.optimized_metrics ?? null,
)
const currency = computed(
  () => props.result?.operational_cost?.currency ?? props.result?.fuel_cost?.currency ?? 'RUB',
)
const dataSource = computed(() => props.result?.data_sources?.routing ?? props.result?.provider)
const runId = computed(() => props.result?.run_id ?? t('route.currentRunId'))
const pointCount = computed(() => draft.value?.points.length ?? 0)
const pointCountLabel = computed(() => t('route.pointCount', { count: pointCount.value }))
const launchDate = computed(() => {
  const rawDate = draft.value?.departure_at
  const date = rawDate ? new Date(rawDate) : new Date()

  return Number.isNaN(date.getTime()) ? rawDate : dateFormatter.value.format(date)
})
const sourceWarning = computed(() =>
  hasFallbackSource(dataSource.value) ? t('route.fallbackWarning') : null,
)
const elapsedTimeLabel = computed(() => {
  const minutes = Math.floor(elapsedSeconds.value / 60)
  const seconds = elapsedSeconds.value % 60

  if (!minutes) {
    return t('route.seconds', { seconds })
  }

  return t('route.minutesSeconds', {
    minutes,
    seconds: seconds.toString().padStart(2, '0'),
  })
})
const calculationStatus = computed(() => {
  if (elapsedSeconds.value < 5) {
    return t('route.statusPrepare')
  }

  if (elapsedSeconds.value < 20) {
    return t('route.statusRoadData')
  }

  if (elapsedSeconds.value < 60) {
    return t('route.statusOptimize')
  }

  return t('route.statusLong')
})

const resultRows = computed(() => {
  const current = metrics.value

  if (!current) {
    return []
  }

  return [
    {
      label: t('route.resultRows.distance'),
      value: `${formatNumber(current.distance_km, 0)} ${t('route.units.kilometer')}`,
    },
    { label: t('route.resultRows.duration'), value: formatRouteDuration(current.duration_min) },
    {
      label: t('route.resultRows.cost'),
      value: formatMoney(current.operational_cost || current.fuel_cost, currency.value, true),
    },
    {
      label: t('route.resultRows.fuel'),
      value: `${formatNumber(current.fuel_liters, 1)} ${t('route.units.liter')}`,
    },
  ]
})

function formatRouteDuration(minutes: number | null | undefined) {
  if (minutes === null || minutes === undefined || Number.isNaN(minutes)) {
    return '—'
  }

  const hours = Math.floor(minutes / 60)
  const rest = Math.round(minutes % 60)

  if (hours <= 0) {
    return t('route.units.minute', { minutes: rest })
  }

  return t('route.units.hourMinute', { hours, minutes: rest })
}

function addPoint() {
  if (!draft.value) {
    return
  }

  const pointIndex = draft.value.points.length
  const previousPoint = draft.value.points[pointIndex - 1]

  draft.value.points.push({
    label: t('pointInput.defaultLabel', { number: pointIndex + 1 }),
    lat: Number(((previousPoint?.lat ?? 55.7558) + 0.08).toFixed(6)),
    lon: Number(((previousPoint?.lon ?? 37.6173) + 0.08).toFixed(6)),
  })
  toast.success(t('pointInput.added'), {
    duration: 1600,
  })
}

function updatePoint(index: number, point: Point) {
  if (!draft.value?.points[index]) {
    return
  }

  Object.assign(draft.value.points[index], point)
}

function removePoint(index: number) {
  if (!draft.value) {
    return
  }

  draft.value.points.splice(index, 1)
}

function movePoint(index: number, direction: -1 | 1) {
  if (!draft.value) {
    return
  }

  const targetIndex = index + direction

  if (targetIndex < 0 || targetIndex >= draft.value.points.length) {
    return
  }

  const [point] = draft.value.points.splice(index, 1)

  if (point) {
    draft.value.points.splice(targetIndex, 0, point)
  }
}

function runFromCoordinatesSheet() {
  coordinatesOpen.value = false
  emit('run')
}

const pointKeys = new WeakMap<Point, string>()
let nextPointKey = 0

function getPointKey(point: Point) {
  const existingKey = pointKeys.get(point)

  if (existingKey) {
    return existingKey
  }

  const key = `point-${nextPointKey}`
  nextPointKey += 1
  pointKeys.set(point, key)

  return key
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
    <header class="route-header">
      <div class="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <Badge variant="outline" class="route-kicker">{{ t('route.geneticBadge') }}</Badge>
        <span>{{ pointCountLabel }}</span>
        <Badge v-if="result" variant="secondary">{{ t('route.resultReady') }}</Badge>
      </div>

      <div class="route-title-row">
        <div class="route-title-copy">
          <h1 class="route-page-title">
            {{ t('route.title') }}
          </h1>
          <p class="w-full max-w-[48rem] text-sm leading-6 text-muted-foreground">
            {{ t('route.description') }}
          </p>
        </div>

        <div class="route-actions-panel">
          <Button
            variant="outline"
            class="route-action-button rounded-xl"
            @click="coordinatesOpen = true"
          >
            <MapPin class="size-4" />
            {{ t('route.setCoordinates') }}
          </Button>
          <Button
            variant="outline"
            class="route-action-button rounded-xl"
            :disabled="!result"
            @click="emit('openAnalysis')"
          >
            <BarChart3 class="size-4" />
            {{ t('route.currentRunAnalysis') }}
          </Button>
          <Button
            :disabled="!canRun"
            class="route-action-button route-action-button--primary rounded-xl"
            @click="emit('run')"
          >
            <Play v-if="!running" class="size-4" />
            {{ running ? t('route.calculationRunning') : t('route.calculate') }}
          </Button>
        </div>
      </div>
    </header>

    <p
      v-if="error"
      class="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive"
    >
      {{ error }}
    </p>

    <div class="route-map-layout">
      <section class="route-stage">
        <InteractiveRouteMap
          v-model:draft="draft"
          :result="result"
          :selected-alternative-rank="selectedAlternativeRank"
        />
      </section>

      <RouteFactorsPanel class="route-factors-side" :result="result" layout="vertical" />
    </div>

    <MetricsDashboard v-if="result" :result="result" :loading="false" />

    <RouteDecisionPanel v-if="result" :result="result" />

    <Card v-if="result" class="overflow-hidden">
      <CardContent class="grid gap-4 p-4 lg:grid-cols-[minmax(0,1fr)_auto]">
        <div class="min-w-0">
          <div class="mb-3 flex flex-wrap items-center gap-2">
            <h2 class="text-base font-semibold text-foreground">{{ t('route.resultTitle') }}</h2>
            <Badge variant="secondary" class="gap-1.5">
              <CheckCircle2 class="size-3.5" />
              {{ t('route.ready') }}
            </Badge>
          </div>

          <div class="grid gap-3 text-sm sm:grid-cols-2 xl:grid-cols-3">
            <div>
              <p class="text-xs text-muted-foreground">{{ t('route.launchDate') }}</p>
              <p class="font-medium text-foreground">{{ launchDate }}</p>
            </div>
            <details v-if="result?.run_id" class="group">
              <summary class="cursor-pointer list-none text-xs font-medium text-muted-foreground">
                {{ t('route.technicalData') }}
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
            {{ t('route.dataSource') }}
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
            {{ t('route.coordinatesTitle') }}
          </SheetTitle>
          <SheetDescription>
            {{ t('route.coordinatesDescription') }}
          </SheetDescription>
        </SheetHeader>

        <div v-if="draft" class="min-h-0 flex-1 overflow-y-auto px-4">
          <Tabs default-value="route" class="grid gap-4 py-4">
            <div class="route-tabs-wrap">
              <TabsList class="route-tabs-list">
                <TabsTrigger class="route-tabs-trigger" value="route">
                  {{ t('route.tabs.route') }}
                </TabsTrigger>
                <TabsTrigger class="route-tabs-trigger" value="vehicle">
                  {{ t('route.tabs.vehicle') }}
                </TabsTrigger>
                <TabsTrigger class="route-tabs-trigger" value="cargo">
                  {{ t('route.tabs.cargo') }}
                </TabsTrigger>
                <TabsTrigger class="route-tabs-trigger" value="constraints">
                  {{ t('route.tabs.constraints') }}
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="route" class="m-0 grid gap-4">
              <div class="grid gap-3 sm:grid-cols-2">
                <div class="grid gap-2">
                  <Label class="text-xs text-muted-foreground">{{ t('route.routeProfile') }}</Label>
                  <Select v-model="draft.profile" :aria-label="t('route.routeProfile')">
                    <SelectTrigger class="w-full bg-background">
                      <SelectValue :placeholder="t('route.routeProfilePlaceholder')" />
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
                  <Label class="text-xs text-muted-foreground">{{ t('route.priority') }}</Label>
                  <Select v-model="draft.priority_profile" :aria-label="t('route.priority')">
                    <SelectTrigger class="w-full bg-background">
                      <SelectValue :placeholder="t('route.priorityPlaceholder')" />
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
              </div>

              <div class="grid gap-3 rounded-xl border bg-background/65 p-3">
                <div class="flex items-center justify-between gap-3">
                  <div>
                    <p class="text-xs font-medium text-foreground">
                      {{ t('route.optimizeOrderTitle') }}
                    </p>
                    <p class="text-xs text-muted-foreground">
                      {{ t('route.optimizeOrderDescription') }}
                    </p>
                  </div>
                  <Switch v-model="draft.optimize" />
                </div>
                <div class="flex items-center justify-between gap-3">
                  <div>
                    <p class="text-xs font-medium text-foreground">
                      {{ t('route.fixEndsTitle') }}
                    </p>
                    <p class="text-xs text-muted-foreground">
                      {{ t('route.fixEndsDescription') }}
                    </p>
                  </div>
                  <Switch v-model="draft.fix_ends" />
                </div>
              </div>

              <section class="grid gap-3">
                <div class="flex items-center justify-between gap-3">
                  <div>
                    <h3 class="text-sm font-semibold text-foreground">
                      {{ t('route.routePoints') }}
                    </h3>
                    <p class="text-xs text-muted-foreground">{{ t('route.routePointsHint') }}</p>
                  </div>
                  <Button variant="outline" size="sm" class="h-8 rounded-lg" @click="addPoint">
                    <Plus class="size-3.5" />
                    {{ t('route.addPoint') }}
                  </Button>
                </div>

                <template v-for="(point, index) in draft.points" :key="getPointKey(point)">
                  <PointInputCard
                    :point="point"
                    :index="index"
                    :can-remove="draft.points.length > 0"
                    :can-move-up="index > 0"
                    :can-move-down="index < draft.points.length - 1"
                    @update="updatePoint(index, $event)"
                    @remove="removePoint(index)"
                    @move-up="movePoint(index, -1)"
                    @move-down="movePoint(index, 1)"
                  />
                </template>
              </section>
            </TabsContent>

            <TabsContent value="vehicle" class="m-0 grid gap-4">
              <Card class="surface-card">
                <CardHeader class="pb-2">
                  <CardTitle class="text-sm">{{ t('route.vehicleParams') }}</CardTitle>
                </CardHeader>
                <CardContent class="grid gap-3 sm:grid-cols-2">
                  <div class="grid gap-2">
                    <Label class="text-xs text-muted-foreground">{{
                      t('route.vehicleClass')
                    }}</Label>
                    <Select v-model="draft.vehicle_class" :aria-label="t('route.vehicleClass')">
                      <SelectTrigger class="w-full bg-background">
                        <SelectValue :placeholder="t('route.vehicleClassPlaceholder')" />
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
                    <Label class="text-xs text-muted-foreground">{{
                      t('route.fuelConsumption')
                    }}</Label>
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
                    <Label class="text-xs text-muted-foreground">{{ t('route.weight') }}</Label>
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
                    <Label class="text-xs text-muted-foreground">{{ t('route.height') }}</Label>
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
                    <Label class="text-xs text-muted-foreground">{{ t('route.width') }}</Label>
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
                    <Label class="text-xs text-muted-foreground">{{ t('route.length') }}</Label>
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
                    <Label class="text-xs text-muted-foreground">{{ t('route.payload') }}</Label>
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
                  <CardTitle class="text-sm">{{ t('route.cvrpTitle') }}</CardTitle>
                  <p class="text-xs leading-5 text-muted-foreground">
                    {{ t('route.cvrpDescription') }}
                  </p>
                </CardHeader>
                <CardContent class="grid gap-3 sm:grid-cols-2">
                  <div class="grid gap-2">
                    <Label class="text-xs text-muted-foreground">{{
                      t('route.cargoWeight')
                    }}</Label>
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
                  <CardTitle class="text-sm">{{ t('route.constraintsTitle') }}</CardTitle>
                </CardHeader>
                <CardContent class="grid gap-3 sm:grid-cols-2">
                  <div class="grid gap-2">
                    <Label class="text-xs text-muted-foreground">{{
                      t('route.maxDistance')
                    }}</Label>
                    <Input
                      :value="draft.constraints.max_distance_km ?? ''"
                      class="h-9"
                      type="number"
                      min="0"
                      @input="draft.constraints.max_distance_km = nullableNumberValue($event)"
                    />
                  </div>
                  <div class="grid gap-2">
                    <Label class="text-xs text-muted-foreground">{{
                      t('route.maxDuration')
                    }}</Label>
                    <Input
                      :value="draft.constraints.max_duration_min ?? ''"
                      class="h-9"
                      type="number"
                      min="0"
                      @input="draft.constraints.max_duration_min = nullableNumberValue($event)"
                    />
                  </div>
                  <div class="grid gap-2">
                    <Label class="text-xs text-muted-foreground">{{ t('route.maxCost') }}</Label>
                    <Input
                      :value="draft.constraints.max_operational_cost ?? ''"
                      class="h-9"
                      type="number"
                      min="0"
                      @input="draft.constraints.max_operational_cost = nullableNumberValue($event)"
                    />
                  </div>
                  <div class="grid gap-2">
                    <Label class="text-xs text-muted-foreground">{{ t('route.maxCo2') }}</Label>
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
            {{ t('route.clear') }}
          </Button>
          <div class="flex flex-wrap gap-2">
            <Button variant="outline" @click="settingsOpen = true">
              <SlidersHorizontal class="size-4" />
              {{ t('route.advancedSettings') }}
            </Button>
            <Button :disabled="!canRun" @click="runFromCoordinatesSheet">
              <Play v-if="!running" class="size-4" />
              {{ running ? t('route.calculationRunning') : t('route.calculate') }}
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
            {{ t('route.advancedSettings') }}
          </SheetTitle>
          <SheetDescription>
            {{ t('route.advancedSettingsDescription') }}
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
      class="route-calculation-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="route-calculation-title"
    >
      <Card class="route-calculation-card">
        <CardContent class="route-calculation-content">
          <div class="route-calculation-head">
            <div class="route-calculation-icon">
              <RefreshCw class="size-5 animate-spin" />
            </div>

            <div class="min-w-0">
              <h2 id="route-calculation-title" class="route-calculation-title">
                {{ t('route.calculationTitle') }}
              </h2>
              <p class="route-calculation-status" aria-live="polite">
                {{ calculationStatus }}
              </p>
            </div>
          </div>

          <div class="route-calculation-meta">
            <span>{{ t('route.elapsed', { time: elapsedTimeLabel }) }}</span>
            <span>{{ pointCountLabel }}</span>
          </div>

          <p class="route-calculation-note">
            {{ t('route.calculationNote') }}
          </p>
        </CardContent>
      </Card>
    </div>
  </Teleport>
</template>

<style scoped>
.route-header {
  display: grid;
  min-width: 0;
  gap: 0.5rem;
}

.route-title-row {
  display: flex;
  min-width: 0;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1.5rem;
}

.route-title-copy {
  display: grid;
  min-width: 0;
  flex: 1 1 auto;
  gap: 0.25rem;
}

.route-page-title {
  font-size: 1.5rem;
  font-weight: 600;
  line-height: 2rem;
  letter-spacing: 0;
  color: var(--foreground);
}

.route-kicker {
  border-color: var(--border);
  background: var(--card);
  color: var(--foreground);
  box-shadow: none;
}

.route-actions-panel {
  display: flex;
  width: fit-content;
  max-width: 100%;
  flex: 0 0 auto;
  flex-wrap: nowrap;
  align-items: center;
  justify-content: flex-end;
  gap: 0.625rem;
  border: 1px solid var(--border);
  border-radius: 1rem;
  background: var(--card);
  padding: 0.5rem;
  box-shadow: 0 10px 30px hsl(0 0% 0% / 0.05);
}

.route-action-button {
  border-color: var(--border);
  background: var(--card);
  color: var(--foreground);
  box-shadow: none;
}

.route-action-button:hover {
  background: var(--accent);
  color: var(--accent-foreground);
}

.route-action-button--primary,
.route-action-button--primary:hover {
  border-color: var(--primary);
  background: var(--primary);
  color: var(--primary-foreground);
  box-shadow: none;
}

.route-map-layout {
  display: grid;
  min-width: 0;
  grid-template-columns: minmax(0, 1fr) minmax(11rem, 12.5rem);
  align-items: start;
  gap: 1.5rem;
}

.route-stage {
  --route-map-inset: 0.75rem;

  position: relative;
  isolation: isolate;
  height: 50rem;
  min-height: 38rem;
  overflow: hidden;
  border: 1px solid var(--border);
  border-radius: 1.25rem;
  background: var(--card);
  box-shadow: 0 16px 36px hsl(0 0% 0% / 0.07);
  resize: vertical;
}

.route-stage :deep(.interactive-map-shell) {
  border-radius: 1rem;
}

.route-factors-side {
  align-self: start;
}

.route-tabs-wrap {
  min-width: 0;
  width: 100%;
}

.route-tabs-list {
  display: grid;
  width: 100%;
  height: auto;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 0.25rem;
}

.route-tabs-trigger {
  min-width: 0;
  min-height: 2.25rem;
  height: auto;
  padding: 0.375rem 0.625rem;
  white-space: normal;
  line-height: 1.2rem;
  text-align: center;
}

.surface-card {
  border-radius: 0.875rem;
  background: var(--card);
}

.route-calculation-overlay {
  position: fixed;
  inset: 0;
  z-index: 50;
  display: grid;
  place-items: center;
  background: hsl(0 0% 0% / 0.38);
  padding: 1rem;
}

.route-calculation-card {
  width: min(92vw, 30rem);
  gap: 0;
  overflow: hidden;
  border-color: var(--border);
  border-radius: 0.875rem;
  background: var(--card);
  color: var(--card-foreground);
  padding-block: 0;
  box-shadow: 0 18px 42px hsl(0 0% 0% / 0.14);
}

.route-calculation-content {
  display: grid;
  gap: 1rem;
  padding: 1.25rem;
}

.route-calculation-head {
  display: flex;
  min-width: 0;
  align-items: flex-start;
  gap: 0.75rem;
}

.route-calculation-icon {
  display: flex;
  width: 2.25rem;
  height: 2.25rem;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--border);
  border-radius: 0.625rem;
  background: var(--secondary);
  color: var(--secondary-foreground);
}

.route-calculation-title {
  color: var(--foreground);
  font-size: 1rem;
  font-weight: 600;
  line-height: 1.35rem;
}

.route-calculation-status {
  margin-top: 0.25rem;
  color: var(--muted-foreground);
  font-size: 0.875rem;
  line-height: 1.25rem;
}

.route-calculation-meta {
  display: flex;
  min-width: 0;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem 1rem;
  border: 1px solid var(--border);
  border-radius: 0.625rem;
  background: var(--muted);
  padding: 0.625rem 0.75rem;
  color: var(--muted-foreground);
  font-size: 0.75rem;
  line-height: 1rem;
}

.route-calculation-note {
  color: var(--muted-foreground);
  font-size: 0.8125rem;
  line-height: 1.25rem;
}

@media (max-width: 1320px) {
  .route-map-layout {
    grid-template-columns: minmax(0, 1fr) minmax(10.75rem, 12rem);
  }
}

@media (max-width: 1180px) {
  .route-title-row {
    flex-direction: column;
    gap: 0.75rem;
  }

  .route-actions-panel {
    width: 100%;
    flex-basis: auto;
    flex-wrap: wrap;
    justify-content: flex-start;
  }

  .route-map-layout {
    grid-template-columns: 1fr;
  }

  .route-stage {
    --route-map-inset: 0.5rem;

    height: 32rem;
    min-height: 24rem;
    resize: none;
  }
}

@media (max-width: 640px) {
  .route-tabs-list {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .route-actions-panel {
    border-radius: 1rem;
  }

  .route-action-button {
    width: 100%;
  }

  .route-stage {
    --route-map-inset: 0;

    height: auto;
    min-height: 0;
    overflow: visible;
    border-radius: 1rem;
    background: transparent;
    box-shadow: none;
  }
}
</style>
