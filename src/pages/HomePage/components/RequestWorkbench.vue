<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
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

const { t } = useI18n({ useScope: 'global' })
const jsonOpen = ref(false)

const profileKeys = ['driving', 'walking', 'cycling'] as const
const vehicleKeys = ['passenger', 'light_truck', 'heavy_truck'] as const
const priorityKeys = ['balanced', 'fastest', 'cheapest', 'greenest'] as const
const strategyKeys = ['strict', 'balanced', 'custom', 'user-driven'] as const
const modeKeys = ['weighted', 'pareto'] as const
const fuelKeys = ['petrol', 'diesel'] as const

const profileOptions = computed(() =>
  profileKeys.map((value) => [value, t(`route.options.profiles.${value}`)] as const),
)
const vehicleOptions = computed(() =>
  vehicleKeys.map((value) => [value, t(`route.options.vehicles.${value}`)] as const),
)
const priorityOptions = computed(() =>
  priorityKeys.map((value) => [value, t(`route.options.priority.${value}`)] as const),
)
const strategyOptions = computed(() =>
  strategyKeys.map((value) => [value, t(`workbench.strategy.${value}`)] as const),
)
const modeOptions = computed(() =>
  modeKeys.map((value) => [value, t(`workbench.mode.${value}`)] as const),
)
const fuelOptions = computed(() =>
  fuelKeys.map((value) => [value, t(`workbench.fuel.${value}`)] as const),
)
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

function criterionLabel(key: string) {
  return t(`workbench.criteria.${key}`)
}

function stringValue(event: Event) {
  return (event.target as HTMLInputElement).value
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
            {{ t('route.advancedSettings') }}
          </CardTitle>
          <CardDescription class="mt-1 leading-5">
            {{ t('workbench.description') }}
          </CardDescription>
        </div>
        <Badge variant="outline">{{ t('workbench.additional') }}</Badge>
      </div>
      <div class="flex flex-wrap gap-2">
        <Button :disabled="!canRun" @click="emit('run')">
          <Play data-icon="inline-start" />
          {{ running ? t('workbench.running') : t('workbench.run') }}
        </Button>
        <Button variant="outline" :disabled="running" @click="emit('resetDraft')">
          <RefreshCw data-icon="inline-start" />
          {{ t('route.clear') }}
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
            <TabsTrigger value="base">{{ t('workbench.tabs.request') }}</TabsTrigger>
            <TabsTrigger value="cargo">{{ t('workbench.tabs.cargo') }}</TabsTrigger>
            <TabsTrigger value="weights">{{ t('workbench.tabs.criteria') }}</TabsTrigger>
          </TabsList>
        </div>

        <ScrollArea class="h-[calc(100vh-23rem)] min-h-[24rem]">
          <TabsContent value="base" class="m-0 flex flex-col gap-5 p-4">
            <section class="grid gap-3 sm:grid-cols-2">
              <div class="flex items-center justify-between gap-3 rounded-md border p-3">
                <div class="min-w-0">
                  <Label class="text-sm">{{ t('route.optimizeOrderTitle') }}</Label>
                  <p class="text-xs text-muted-foreground">
                    {{ t('route.optimizeOrderDescription') }}
                  </p>
                </div>
                <Switch v-model="draft.optimize" />
              </div>
              <div class="flex items-center justify-between gap-3 rounded-md border p-3">
                <div class="min-w-0">
                  <Label class="text-sm">{{ t('route.fixEndsTitle') }}</Label>
                  <p class="text-xs text-muted-foreground">
                    {{ t('route.fixEndsDescription') }}
                  </p>
                </div>
                <Switch v-model="draft.fix_ends" />
              </div>
            </section>

            <section class="grid gap-3 sm:grid-cols-2">
              <div class="flex flex-col gap-2">
                <Label>{{ t('route.routeProfile') }}</Label>
                <Select v-model="draft.profile" :aria-label="t('route.routeProfile')">
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
                <Label>{{ t('route.priority') }}</Label>
                <Select v-model="draft.priority_profile" :aria-label="t('route.priority')">
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
                <Label>{{ t('workbench.optimizeMode') }}</Label>
                <Select v-model="draft.optimize_mode" :aria-label="t('workbench.optimizeMode')">
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
                <Label>{{ t('workbench.strategyLabel') }}</Label>
                <Select
                  v-model="draft.optimization_strategy"
                  :aria-label="t('workbench.strategyLabel')"
                >
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
            </section>

            <div class="flex items-center justify-between gap-3 rounded-md border p-3">
              <div class="min-w-0">
                <Label class="text-sm">{{ t('workbench.dynamicWeights') }}</Label>
                <p class="text-xs text-muted-foreground">{{ t('workbench.dynamicWeightsHint') }}</p>
              </div>
              <Switch v-model="draft.use_dynamic_weights" />
            </div>
          </TabsContent>

          <TabsContent value="cargo" class="m-0 flex flex-col gap-5 p-4">
            <section class="grid gap-3 sm:grid-cols-2">
              <div class="flex flex-col gap-2">
                <Label>{{ t('route.vehicleClass') }}</Label>
                <Select v-model="draft.vehicle_class" :aria-label="t('route.vehicleClass')">
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
                <Label>{{ t('workbench.fuelLabel') }}</Label>
                <Select v-model="draft.fuel_type" :aria-label="t('workbench.fuelLabel')">
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
                <Label>{{ t('route.cargoWeight') }}</Label>
                <Input
                  :value="draft.cargo.weight_t ?? ''"
                  type="number"
                  min="0"
                  step="0.1"
                  @input="draft.cargo.weight_t = nullableNumberValue($event)"
                />
              </div>
              <div class="flex flex-col gap-2">
                <Label>{{ t('route.payload') }}</Label>
                <Input
                  :value="draft.vehicle_capacity_t ?? ''"
                  type="number"
                  min="0"
                  step="0.1"
                  @input="draft.vehicle_capacity_t = nullableNumberValue($event)"
                />
              </div>
              <div class="flex flex-col gap-2">
                <Label>{{ t('route.fuelConsumption') }}</Label>
                <Input
                  :value="draft.fuel_consumption_l_per_100km ?? ''"
                  type="number"
                  min="1"
                  step="0.1"
                  @input="draft.fuel_consumption_l_per_100km = nullableNumberValue($event)"
                />
              </div>
              <div class="flex flex-col gap-2">
                <Label>{{ t('workbench.driverCost') }}</Label>
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
                <Label>{{ t('workbench.vehicleCount') }}</Label>
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
                <Label>{{ t('workbench.depotIndex') }}</Label>
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
                  <Label class="text-sm">{{ t('workbench.returnToDepot') }}</Label>
                  <p class="text-xs text-muted-foreground">
                    {{ t('workbench.returnToDepotHint') }}
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
                :label="criterionLabel(key)"
                :model-value="value"
                @update:model-value="updateWeight(key, $event)"
              />
            </section>

            <details class="advanced-details">
              <summary>{{ t('workbench.gaParams') }}</summary>
              <section class="mt-3 grid gap-3 sm:grid-cols-2">
                <div class="flex flex-col gap-2">
                  <Label>{{ t('workbench.populationSize') }}</Label>
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
                  <Label>{{ t('workbench.generations') }}</Label>
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
                  <Label>{{ t('workbench.crossoverRate') }}</Label>
                  <Input
                    :value="draft.crossover_rate"
                    type="number"
                    min="0.1"
                    max="1"
                    step="0.01"
                    @input="
                      draft.crossover_rate = requiredNumberValue($event, draft.crossover_rate)
                    "
                  />
                </div>
                <div class="flex flex-col gap-2">
                  <Label>{{ t('workbench.mutationRate') }}</Label>
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
                  <Label>{{ t('workbench.maxAlternatives') }}</Label>
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
                  <Label>{{ t('workbench.randomSeed') }}</Label>
                  <Input
                    :value="draft.random_seed ?? ''"
                    type="number"
                    min="0"
                    step="1"
                    @input="draft.random_seed = nullableNumberValue($event)"
                  />
                </div>
              </section>
            </details>
          </TabsContent>
        </ScrollArea>
      </Tabs>
    </CardContent>
    <CardContent v-else class="p-4 text-sm text-muted-foreground">
      {{ t('workbench.empty') }}
    </CardContent>
  </Card>

  <Sheet v-model:open="jsonOpen">
    <SheetContent class="w-[92vw] max-w-[92vw] sm:w-[48rem] sm:max-w-none">
      <SheetHeader>
        <SheetTitle>{{ t('workbench.jsonTitle') }}</SheetTitle>
        <SheetDescription>
          {{ t('workbench.jsonDescription') }}
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
        <Button variant="outline" @click="emit('syncJson')">{{ t('workbench.syncJson') }}</Button>
        <Button @click="emit('applyJson')">{{ t('workbench.applyJson') }}</Button>
      </SheetFooter>
    </SheetContent>
  </Sheet>
</template>

<style scoped>
.advanced-details {
  border: 1px solid var(--border);
  border-radius: 0.75rem;
  background: color-mix(in oklch, var(--background) 74%, transparent);
  padding: 0.875rem;
}

.advanced-details summary {
  cursor: pointer;
  color: var(--foreground);
  font-size: 0.875rem;
  font-weight: 700;
}
</style>
