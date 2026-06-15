<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { Activity, Calculator, Database, Grid3X3, Route, Scale } from 'lucide-vue-next'

import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  ScrollArea,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/shared/ui'
import type {
  CriteriaWeights,
  RouteAnalysisMatrices,
  RouteResponse,
} from '@/shared/api/route.types'
import {
  formatDuration,
  formatMoney,
  formatNumber,
  formatPercent,
} from '@/shared/lib/format/number'
import {
  formatDataSource,
  formatImprovement,
  translateTrigger,
} from '@/shared/lib/format/routePresentation'

const props = defineProps<{
  result: RouteResponse | null
}>()

const selectedAlternativeRank = defineModel<number | null>('selectedAlternativeRank', {
  required: true,
})

const { t } = useI18n({ useScope: 'global' })

type MatrixValue = number | boolean | null
type MatrixSection = {
  key: string
  title: string
  description: string
  matrix: MatrixValue[][]
}

const researcherMode = ref(false)

const criteriaLabelKeys: Record<keyof CriteriaWeights, string> = {
  distance: 'analysis.criteria.distance',
  duration: 'analysis.criteria.duration',
  fuel_cost: 'analysis.criteria.fuelCost',
  emissions: 'analysis.criteria.emissions',
  congestion: 'analysis.criteria.congestion',
  weather_risk: 'analysis.criteria.weatherRisk',
  reliability: 'analysis.criteria.reliability',
  safety: 'analysis.criteria.safety',
  tolls: 'analysis.criteria.tolls',
  road_quality: 'analysis.criteria.roadQuality',
  dynamic_events: 'analysis.criteria.dynamicEvents',
  operational_cost: 'analysis.criteria.operationalCost',
  cargo_risk: 'analysis.criteria.cargoRisk',
}

const currency = computed(
  () => props.result?.operational_cost?.currency ?? props.result?.fuel_cost?.currency ?? 'RUB',
)
const metrics = computed(
  () => props.result?.metrics ?? props.result?.comparison?.optimized_metrics ?? null,
)

const routeOrder = computed(() => {
  const result = props.result

  if (!result) {
    return { baseline: '', optimized: '' }
  }

  return {
    baseline: formatPointOrder(result.comparison?.baseline_ordered_points ?? []),
    optimized: formatPointOrder(result.ordered_points),
  }
})

const comparisonRows = computed(() => {
  const comparison = props.result?.comparison

  if (!comparison) {
    return []
  }

  return [
    {
      label: t('analysis.criteria.distance'),
      baseline: `${formatNumber(comparison.baseline_metrics.distance_km, 1)} ${t('route.units.kilometer')}`,
      optimized: `${formatNumber(comparison.optimized_metrics.distance_km, 1)} ${t('route.units.kilometer')}`,
      delta: `${formatNumber(comparison.delta.distance_km, 1)} ${t('route.units.kilometer')}`,
      improvement: formatImprovement(comparison.improvement_pct.distance_km, 1),
    },
    {
      label: t('analysis.criteria.duration'),
      baseline: formatDuration(comparison.baseline_metrics.duration_min),
      optimized: formatDuration(comparison.optimized_metrics.duration_min),
      delta: formatDuration(Math.abs(comparison.delta.duration_min)),
      improvement: formatImprovement(comparison.improvement_pct.duration_min, 1),
    },
    {
      label: t('analysis.criteria.operationalCost'),
      baseline: formatMoney(comparison.baseline_metrics.operational_cost, currency.value, true),
      optimized: formatMoney(comparison.optimized_metrics.operational_cost, currency.value, true),
      delta: formatMoney(comparison.delta.operational_cost, currency.value, true),
      improvement: formatImprovement(comparison.improvement_pct.operational_cost, 1),
    },
    {
      label: t('analysis.criteria.emissions'),
      baseline: `${formatNumber(comparison.baseline_metrics.co2_kg, 1)} kg`,
      optimized: `${formatNumber(comparison.optimized_metrics.co2_kg, 1)} kg`,
      delta: `${formatNumber(comparison.delta.co2_kg, 1)} kg`,
      improvement: formatImprovement(comparison.improvement_pct.co2_kg, 1),
    },
  ]
})

const summaryCards = computed(() => {
  const comparison = props.result?.comparison
  const current = metrics.value

  if (!comparison || !current) {
    return []
  }

  return [
    {
      label: t('analysis.summary.distanceSaving'),
      value: formatImprovement(comparison.improvement_pct.distance_km, 1),
      detail: `${formatNumber(Math.abs(comparison.delta.distance_km), 1)} ${t('route.units.kilometer')}`,
      icon: Route,
      accent: 'blue',
    },
    {
      label: t('analysis.summary.timeSaving'),
      value: formatImprovement(comparison.improvement_pct.duration_min, 1),
      detail: formatDuration(Math.abs(comparison.delta.duration_min)),
      icon: Activity,
      accent: 'emerald',
    },
    {
      label: t('analysis.summary.totalCost'),
      value: formatMoney(current.operational_cost, currency.value, true),
      detail: t('analysis.comparedToBaseline', {
        value: formatImprovement(comparison.improvement_pct.operational_cost, 1),
      }),
      icon: Scale,
      accent: 'amber',
    },
    {
      label: t('analysis.summary.dataSource'),
      value: formatDataSource(props.result?.data_sources?.routing ?? props.result?.provider),
      detail: props.result?.data_confidence
        ? t('analysis.dataConfidence', {
            value: formatPercent(props.result.data_confidence.score, 1),
          })
        : t('analysis.noConfidence'),
      icon: Database,
      accent: 'violet',
    },
  ]
})

const weightRows = computed(() => {
  const dynamicWeights = props.result?.dynamic_weights
  const base = dynamicWeights?.base
  const adjusted = dynamicWeights?.adjusted

  if (!base || !adjusted) {
    return []
  }

  return (Object.keys(criteriaLabelKeys) as Array<keyof CriteriaWeights>)
    .map((key) => ({
      key,
      label: t(criteriaLabelKeys[key]),
      base: base[key],
      adjusted: adjusted[key],
      delta: adjusted[key] - base[key],
      active: Math.abs(adjusted[key]) > 0.0001,
    }))
    .filter((row) => researcherMode.value || row.active)
})

const scoreRows = computed(() => props.result?.comparison?.optimized_score.components ?? [])
const baselineScoreRows = computed(() => props.result?.comparison?.baseline_score.components ?? [])

const matrixSections = computed<MatrixSection[]>(() => {
  const matrices = props.result?.analysis_matrices

  if (!matrices || !researcherMode.value) {
    return []
  }

  return [
    matrixSection(
      'distance_km',
      t('analysis.matrices.distance.title'),
      t('analysis.matrices.distance.description'),
      matrices.distance_km,
    ),
    matrixSection(
      'duration_min',
      t('analysis.matrices.duration.title'),
      t('analysis.matrices.duration.description'),
      matrices.duration_min,
    ),
    matrixSection(
      'traffic_index',
      t('analysis.matrices.traffic.title'),
      t('analysis.matrices.traffic.description'),
      matrices.traffic_index,
    ),
    matrixSection(
      'road_quality',
      t('analysis.matrices.roadQuality.title'),
      t('analysis.matrices.roadQuality.description'),
      matrices.road_quality,
    ),
    matrixSection(
      'incident_risk',
      t('analysis.matrices.incidentRisk.title'),
      t('analysis.matrices.incidentRisk.description'),
      matrices.incident_risk,
    ),
    matrixSection(
      'infrastructure_access',
      t('analysis.matrices.infrastructure.title'),
      t('analysis.matrices.infrastructure.description'),
      matrices.infrastructure_access,
    ),
  ].filter((section) => hasMatrix(section.matrix))
})

const pointLabels = computed(() => props.result?.analysis_matrices?.point_labels ?? [])
const dynamicTriggers = computed(() => props.result?.dynamic_weights?.triggers ?? [])

function matrixSection(
  key: string,
  title: string,
  description: string,
  matrix: RouteAnalysisMatrices[keyof RouteAnalysisMatrices],
): MatrixSection {
  return {
    key,
    title,
    description,
    matrix: Array.isArray(matrix) ? (matrix as MatrixValue[][]) : [],
  }
}

function hasMatrix(matrix: MatrixValue[][]) {
  return matrix.length > 0 && matrix.some((row) => Array.isArray(row) && row.length > 0)
}

function formatMatrixCell(value: MatrixValue | undefined) {
  if (value === null || typeof value === 'undefined') {
    return t('analysis.dash')
  }

  if (typeof value === 'boolean') {
    return value ? t('analysis.yes') : t('analysis.no')
  }

  return formatNumber(value, Math.abs(value) >= 100 ? 0 : 2)
}

function formatPointOrder(points: Array<{ label?: string | null }>) {
  if (!points.length) {
    return t('analysis.dash')
  }

  return points
    .map((point, index) => point.label || t('analysis.point', { number: index + 1 }))
    .join(' -> ')
}

function formatDynamicTrigger(trigger: string) {
  return translateTrigger(trigger)
}
</script>

<template>
  <div v-if="result" class="analysis-workspace grid min-w-0 gap-5">
    <header class="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
      <div class="grid gap-2">
        <Badge variant="outline" class="w-fit">{{ t('analysis.badge') }}</Badge>
        <h1 class="text-2xl font-semibold tracking-normal text-foreground">
          {{ t('analysis.title') }}
        </h1>
        <p class="max-w-[64rem] text-sm leading-6 text-muted-foreground">
          {{ t('analysis.description') }}
        </p>
      </div>
      <label class="flex items-center gap-3 rounded-lg border bg-card px-3 py-2 text-sm">
        <Switch v-model="researcherMode" :aria-label="t('analysis.researcherMode')" />
        <span>{{ t('analysis.researcherMode') }}</span>
      </label>
    </header>

    <div class="grid gap-4 lg:grid-cols-4">
      <Card
        v-for="card in summaryCards"
        :key="card.label"
        class="analysis-summary-card"
        :class="`analysis-summary-card--${card.accent}`"
      >
        <CardHeader class="analysis-summary-card__header">
          <CardTitle class="flex items-center gap-2 text-sm">
            <span class="analysis-summary-card__icon">
              <component :is="card.icon" class="size-4" />
            </span>
            {{ card.label }}
          </CardTitle>
        </CardHeader>
        <CardContent class="analysis-summary-card__content">
          <strong class="text-2xl font-semibold leading-tight">{{ card.value }}</strong>
          <p class="mt-1 text-xs text-muted-foreground">{{ card.detail }}</p>
        </CardContent>
      </Card>
    </div>

    <Card class="analysis-section-card">
      <CardHeader>
        <CardTitle class="text-base">{{ t('analysis.optimizationResult') }}</CardTitle>
      </CardHeader>
      <CardContent class="grid gap-4">
        <div class="grid gap-3 lg:grid-cols-2">
          <div class="analysis-route-card analysis-route-card--baseline">
            <p class="text-xs font-medium uppercase text-muted-foreground">
              {{ t('analysis.baselineRoute') }}
            </p>
            <p class="mt-2 text-sm leading-6 text-foreground">{{ routeOrder.baseline }}</p>
          </div>
          <div class="analysis-route-card analysis-route-card--optimized">
            <p class="text-xs font-medium uppercase text-muted-foreground">
              {{ t('analysis.selectedRoute') }}
            </p>
            <p class="mt-2 text-sm leading-6 text-foreground">{{ routeOrder.optimized }}</p>
          </div>
        </div>

        <ScrollArea class="analysis-table-scroll w-full">
          <Table class="analysis-comparison-table">
            <TableHeader>
              <TableRow>
                <TableHead>{{ t('analysis.rows.metric') }}</TableHead>
                <TableHead>{{ t('analysis.rows.baseline') }}</TableHead>
                <TableHead>{{ t('analysis.rows.optimized') }}</TableHead>
                <TableHead>{{ t('analysis.rows.delta') }}</TableHead>
                <TableHead>{{ t('analysis.rows.improvement') }}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow
                v-for="row in comparisonRows"
                :key="row.label"
                class="analysis-comparison-row"
              >
                <TableCell
                  class="analysis-comparison-cell font-medium"
                  :data-label="t('analysis.rows.metric')"
                >
                  {{ row.label }}
                </TableCell>
                <TableCell
                  class="analysis-comparison-cell"
                  :data-label="t('analysis.rows.baseline')"
                >
                  {{ row.baseline }}
                </TableCell>
                <TableCell
                  class="analysis-comparison-cell"
                  :data-label="t('analysis.rows.optimized')"
                >
                  {{ row.optimized }}
                </TableCell>
                <TableCell class="analysis-comparison-cell" :data-label="t('analysis.rows.delta')">
                  {{ row.delta }}
                </TableCell>
                <TableCell
                  class="analysis-comparison-cell"
                  :data-label="t('analysis.rows.improvement')"
                >
                  <span class="analysis-improvement">{{ row.improvement }}</span>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </ScrollArea>
      </CardContent>
    </Card>

    <Card class="analysis-section-card">
      <CardHeader>
        <CardTitle class="flex items-center gap-2 text-base">
          <Calculator class="size-4 text-primary" />
          {{ t('analysis.howResultWasBuilt') }}
        </CardTitle>
      </CardHeader>
      <CardContent class="p-0">
        <Tabs default-value="criteria" class="gap-0">
          <div class="border-y bg-muted/40 px-4 py-2">
            <TabsList class="flex h-auto flex-wrap justify-start">
              <TabsTrigger value="criteria">
                <Scale data-icon="inline-start" />
                {{ t('analysis.tabs.criteria') }}
              </TabsTrigger>
              <TabsTrigger value="score">
                <Calculator data-icon="inline-start" />
                {{ t('analysis.tabs.score') }}
              </TabsTrigger>
              <TabsTrigger v-if="researcherMode" value="matrices">
                <Grid3X3 data-icon="inline-start" />
                {{ t('analysis.tabs.matrices') }}
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="criteria" class="m-0 grid gap-4 p-4">
            <div
              class="rounded-lg border bg-background/70 p-3 text-sm leading-6 text-muted-foreground"
            >
              {{ t('analysis.activeCriteriaNote') }}
            </div>

            <div class="flex flex-wrap gap-2">
              <Badge v-for="trigger in dynamicTriggers" :key="trigger" variant="secondary">
                {{ formatDynamicTrigger(trigger) }}
              </Badge>
              <span v-if="!dynamicTriggers.length" class="text-sm text-muted-foreground">
                {{ t('analysis.noDynamicTriggers') }}
              </span>
            </div>

            <ScrollArea class="analysis-weight-scroll w-full">
              <Table class="analysis-weight-table">
                <TableHeader>
                  <TableRow>
                    <TableHead>{{ t('analysis.rows.criterion') }}</TableHead>
                    <TableHead>{{ t('analysis.rows.baseWeight') }}</TableHead>
                    <TableHead>{{ t('analysis.rows.finalWeight') }}</TableHead>
                    <TableHead>{{ t('analysis.rows.change') }}</TableHead>
                    <TableHead v-if="researcherMode">{{ t('analysis.rows.comment') }}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow v-for="row in weightRows" :key="row.key" class="analysis-weight-row">
                    <TableCell
                      class="analysis-weight-cell font-medium"
                      :data-label="t('analysis.rows.criterion')"
                    >
                      {{ row.label }}
                    </TableCell>
                    <TableCell
                      class="analysis-weight-cell"
                      :data-label="t('analysis.rows.baseWeight')"
                    >
                      {{ formatNumber(row.base, 4) }}
                    </TableCell>
                    <TableCell
                      class="analysis-weight-cell"
                      :data-label="t('analysis.rows.finalWeight')"
                    >
                      {{ formatNumber(row.adjusted, 4) }}
                    </TableCell>
                    <TableCell
                      class="analysis-weight-cell"
                      :data-label="t('analysis.rows.change')"
                      :class="
                        row.delta >= 0 ? 'text-positive-foreground' : 'text-negative-foreground'
                      "
                    >
                      {{ row.delta >= 0 ? '+' : '' }}{{ formatNumber(row.delta, 4) }}
                    </TableCell>
                    <TableCell
                      v-if="researcherMode"
                      class="analysis-weight-cell text-muted-foreground"
                      :data-label="t('analysis.rows.comment')"
                    >
                      {{
                        row.active
                          ? t('analysis.participatingComment')
                          : t('analysis.informationalComment')
                      }}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="score" class="m-0 grid gap-4 p-4">
            <div class="rounded-lg border bg-background/70 p-3">
              <p class="text-sm font-medium text-foreground">
                {{ t('analysis.scoreDescriptionTitle') }}
              </p>
              <p v-if="!researcherMode" class="mt-2 text-sm leading-6 text-muted-foreground">
                {{ t('analysis.scoreDescription') }}
              </p>
              <code
                v-else
                class="mt-2 block overflow-x-auto rounded-md bg-muted px-3 py-2 text-xs text-foreground"
              >
                score = sum(weight_i * normalized_metric_i) + constraint_penalty
              </code>
            </div>

            <div v-if="researcherMode" class="analysis-score-grid grid gap-4 xl:grid-cols-2">
              <section class="analysis-score-section rounded-lg border">
                <div class="border-b px-3 py-2 text-sm font-medium">
                  {{ t('analysis.selectedRoute') }}
                </div>
                <ScrollArea class="analysis-score-scroll w-full">
                  <Table class="analysis-score-table">
                    <TableHeader>
                      <TableRow>
                        <TableHead>{{ t('analysis.rows.component') }}</TableHead>
                        <TableHead>{{ t('analysis.rows.raw') }}</TableHead>
                        <TableHead>{{ t('analysis.rows.normalized') }}</TableHead>
                        <TableHead>{{ t('analysis.rows.weight') }}</TableHead>
                        <TableHead>{{ t('analysis.rows.contribution') }}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow v-for="row in scoreRows" :key="row.key" class="analysis-score-row">
                        <TableCell
                          class="analysis-score-cell font-medium"
                          :data-label="t('analysis.rows.component')"
                        >
                          {{ row.label }}
                        </TableCell>
                        <TableCell class="analysis-score-cell" :data-label="t('analysis.rows.raw')">
                          {{ formatNumber(row.raw_value, 3) }}
                        </TableCell>
                        <TableCell
                          class="analysis-score-cell"
                          :data-label="t('analysis.rows.normalized')"
                        >
                          {{ formatNumber(row.normalized_value, 3) }}
                        </TableCell>
                        <TableCell
                          class="analysis-score-cell"
                          :data-label="t('analysis.rows.weight')"
                        >
                          {{ formatNumber(row.weight, 4) }}
                        </TableCell>
                        <TableCell
                          class="analysis-score-cell"
                          :data-label="t('analysis.rows.contribution')"
                        >
                          {{ formatNumber(row.contribution, 4) }}
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </ScrollArea>
              </section>

              <section class="analysis-score-section rounded-lg border">
                <div class="border-b px-3 py-2 text-sm font-medium">
                  {{ t('analysis.baselineRoute') }}
                </div>
                <ScrollArea class="analysis-score-scroll w-full">
                  <Table class="analysis-score-table">
                    <TableHeader>
                      <TableRow>
                        <TableHead>{{ t('analysis.rows.component') }}</TableHead>
                        <TableHead>{{ t('analysis.rows.raw') }}</TableHead>
                        <TableHead>{{ t('analysis.rows.normalized') }}</TableHead>
                        <TableHead>{{ t('analysis.rows.weight') }}</TableHead>
                        <TableHead>{{ t('analysis.rows.contribution') }}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow
                        v-for="row in baselineScoreRows"
                        :key="row.key"
                        class="analysis-score-row"
                      >
                        <TableCell
                          class="analysis-score-cell font-medium"
                          :data-label="t('analysis.rows.component')"
                        >
                          {{ row.label }}
                        </TableCell>
                        <TableCell class="analysis-score-cell" :data-label="t('analysis.rows.raw')">
                          {{ formatNumber(row.raw_value, 3) }}
                        </TableCell>
                        <TableCell
                          class="analysis-score-cell"
                          :data-label="t('analysis.rows.normalized')"
                        >
                          {{ formatNumber(row.normalized_value, 3) }}
                        </TableCell>
                        <TableCell
                          class="analysis-score-cell"
                          :data-label="t('analysis.rows.weight')"
                        >
                          {{ formatNumber(row.weight, 4) }}
                        </TableCell>
                        <TableCell
                          class="analysis-score-cell"
                          :data-label="t('analysis.rows.contribution')"
                        >
                          {{ formatNumber(row.contribution, 4) }}
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </ScrollArea>
              </section>
            </div>
          </TabsContent>

          <TabsContent v-if="researcherMode" value="matrices" class="m-0 grid gap-4 p-4">
            <div
              v-if="!matrixSections.length"
              class="rounded-lg border p-4 text-sm text-muted-foreground"
            >
              {{ t('analysis.noMatrices') }}
            </div>

            <section v-for="section in matrixSections" :key="section.key" class="rounded-lg border">
              <div class="border-b px-3 py-2">
                <p class="text-sm font-medium text-foreground">{{ section.title }}</p>
                <p class="mt-1 text-xs text-muted-foreground">{{ section.description }}</p>
              </div>
              <ScrollArea class="w-full">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead class="sticky left-0 z-10 bg-card">
                        {{ t('analysis.fromTo') }}
                      </TableHead>
                      <TableHead v-for="label in pointLabels" :key="label" class="min-w-28">
                        {{ label }}
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow
                      v-for="(row, rowIndex) in section.matrix"
                      :key="`${section.key}-${rowIndex}`"
                    >
                      <TableCell class="sticky left-0 z-10 bg-card font-medium">
                        {{ pointLabels[rowIndex] ?? t('analysis.point', { number: rowIndex + 1 }) }}
                      </TableCell>
                      <TableCell v-for="(_, columnIndex) in pointLabels" :key="columnIndex">
                        {{ formatMatrixCell(row[columnIndex]) }}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </ScrollArea>
            </section>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>

    <Card v-if="researcherMode" class="analysis-section-card">
      <CardHeader>
        <CardTitle class="text-base">{{ t('analysis.alternativesTitle') }}</CardTitle>
      </CardHeader>
      <CardContent class="grid gap-4">
        <div class="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          <div
            v-for="alternative in result.alternatives"
            :key="alternative.rank"
            class="rounded-lg border p-3"
          >
            <div class="mb-2 flex items-center justify-between gap-2">
              <p class="text-sm font-medium">
                {{ t('analysis.alternative', { rank: alternative.rank }) }}
              </p>
              <Button
                variant="outline"
                size="sm"
                @click="
                  selectedAlternativeRank =
                    selectedAlternativeRank === alternative.rank ? null : alternative.rank
                "
              >
                {{
                  selectedAlternativeRank === alternative.rank
                    ? t('analysis.hide')
                    : t('analysis.showOnMap')
                }}
              </Button>
            </div>
            <div class="grid gap-1 text-xs text-muted-foreground">
              <span>
                {{ formatNumber(alternative.metrics.distance_km, 1) }}
                {{ t('route.units.kilometer') }}
              </span>
              <span>{{ formatDuration(alternative.metrics.duration_min) }}</span>
              <span>{{ formatNumber(alternative.metrics.co2_kg, 1) }} kg CO2</span>
            </div>
          </div>
        </div>

        <div
          v-if="result.diagnostics"
          class="grid gap-2 rounded-lg border p-3 text-sm sm:grid-cols-2"
        >
          <span class="text-muted-foreground">{{ t('analysis.diagnostics.mode') }}</span>
          <span>{{ result.diagnostics.mode }}</span>
          <span class="text-muted-foreground">{{ t('analysis.diagnostics.evaluated') }}</span>
          <span>{{ result.diagnostics.evaluated_solutions }}</span>
          <span class="text-muted-foreground">{{ t('analysis.diagnostics.repaired') }}</span>
          <span>{{ result.diagnostics.repaired_solutions }}</span>
          <span class="text-muted-foreground">{{ t('analysis.diagnostics.forbiddenEdges') }}</span>
          <span>{{ result.diagnostics.forbidden_edges }}</span>
        </div>
      </CardContent>
    </Card>
  </div>
</template>

<style scoped>
.analysis-summary-card {
  --analysis-accent: var(--chart-1);

  position: relative;
  overflow: hidden;
  border-color: color-mix(in oklch, var(--analysis-accent) 14%, var(--border));
  background: linear-gradient(
    180deg,
    color-mix(in oklch, var(--analysis-accent) 4%, var(--card)),
    var(--card) 58%
  );
  gap: 0;
  padding-block: 0;
  box-shadow: 0 10px 24px hsl(0 0% 0% / 0.045);
}

.analysis-summary-card__header {
  padding: 1rem 1.25rem 0.625rem;
}

.analysis-summary-card__content {
  padding: 0 1.25rem 1rem;
}

.analysis-summary-card__icon {
  display: inline-flex;
  width: 1.75rem;
  height: 1.75rem;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  border: 1px solid color-mix(in oklch, var(--analysis-accent) 18%, var(--border));
  border-radius: 0.5rem;
  background: color-mix(in oklch, var(--analysis-accent) 7%, var(--card));
  color: color-mix(in oklch, var(--analysis-accent) 58%, var(--foreground));
}

.analysis-summary-card--blue {
  --analysis-accent: var(--chart-1);
}

.analysis-summary-card--emerald {
  --analysis-accent: var(--chart-2);
}

.analysis-summary-card--amber {
  --analysis-accent: var(--chart-3);
}

.analysis-summary-card--violet {
  --analysis-accent: var(--chart-4);
}

.analysis-route-card {
  border: 1px solid var(--border);
  border-radius: 0.5rem;
  padding: 0.75rem;
  min-width: 0;
}

.analysis-route-card p {
  overflow-wrap: anywhere;
}

.analysis-section-card {
  gap: 0;
  min-width: 0;
  overflow: hidden;
  padding-block: 0;
}

.analysis-section-card :deep([data-slot='card-header']) {
  padding: 1.25rem 1.5rem 0.75rem;
}

.analysis-section-card :deep([data-slot='card-content']) {
  min-width: 0;
  padding: 0 1.5rem 1.25rem;
}

.analysis-table-scroll {
  min-width: 0;
  max-width: 100%;
}

.analysis-score-grid,
.analysis-score-section,
.analysis-score-scroll,
.analysis-weight-scroll {
  min-width: 0;
  max-width: 100%;
}

.analysis-score-section {
  overflow: hidden;
}

.analysis-section-card section {
  min-width: 0;
  max-width: 100%;
}

.analysis-route-card--baseline {
  background: var(--background);
}

.analysis-route-card--optimized {
  border-color: color-mix(in oklch, var(--chart-2) 16%, var(--border));
  background: color-mix(in oklch, var(--chart-2) 5%, var(--background));
}

.analysis-improvement {
  display: inline-flex;
  align-items: center;
  border: 1px solid color-mix(in oklch, var(--chart-2) 22%, var(--border));
  border-radius: 999px;
  background: color-mix(in oklch, var(--chart-2) 7%, var(--card));
  padding: 0.125rem 0.5rem;
  color: color-mix(in oklch, var(--chart-2) 68%, var(--foreground));
  font-size: 0.8125rem;
  font-weight: 600;
  line-height: 1.25rem;
}

:global(.dark) .analysis-summary-card {
  box-shadow: 0 12px 28px hsl(0 0% 0% / 0.22);
}

@media (max-width: 640px) {
  .analysis-workspace {
    gap: 1rem;
  }

  .analysis-workspace > header {
    gap: 0.75rem;
  }

  .analysis-workspace > header label {
    width: 100%;
    justify-content: space-between;
  }

  .analysis-summary-card__header {
    padding: 0.875rem 1rem 0.5rem;
  }

  .analysis-summary-card__content {
    padding: 0 1rem 0.875rem;
  }

  .analysis-section-card {
    border-radius: 0.875rem;
  }

  .analysis-section-card :deep([data-slot='card-header']) {
    padding: 1rem 1rem 0.625rem;
  }

  .analysis-section-card :deep([data-slot='card-content']) {
    padding: 0 1rem 1rem;
  }

  .analysis-table-scroll {
    overflow: visible;
  }

  .analysis-table-scroll :deep([data-slot='scroll-area-viewport']),
  .analysis-score-scroll :deep([data-slot='scroll-area-viewport']),
  .analysis-weight-scroll :deep([data-slot='scroll-area-viewport']) {
    overflow: visible !important;
  }

  :deep(.analysis-comparison-table),
  :deep(.analysis-score-table),
  :deep(.analysis-weight-table) {
    display: block;
    width: 100%;
    min-width: 0;
  }

  :deep(.analysis-comparison-table thead),
  :deep(.analysis-score-table thead),
  :deep(.analysis-weight-table thead) {
    display: none;
  }

  :deep(.analysis-comparison-table tbody),
  :deep(.analysis-score-table tbody),
  :deep(.analysis-weight-table tbody) {
    display: grid;
    gap: 0.625rem;
  }

  .analysis-comparison-row,
  .analysis-score-row,
  .analysis-weight-row {
    display: grid;
    gap: 0;
    border: 1px solid var(--border);
    border-radius: 0.75rem;
    background: var(--background);
    padding: 0.25rem 0;
  }

  .analysis-comparison-cell,
  .analysis-score-cell,
  .analysis-weight-cell {
    display: grid;
    grid-template-columns: minmax(6.5rem, 0.75fr) minmax(0, 1fr);
    align-items: start;
    gap: 0.75rem;
    border: 0;
    padding: 0.5rem 0.75rem;
    overflow-wrap: anywhere;
  }

  .analysis-comparison-cell::before,
  .analysis-score-cell::before,
  .analysis-weight-cell::before {
    content: attr(data-label);
    color: var(--muted-foreground);
    font-size: 0.75rem;
    font-weight: 600;
    line-height: 1.25rem;
  }

  .analysis-comparison-cell + .analysis-comparison-cell,
  .analysis-score-cell + .analysis-score-cell,
  .analysis-weight-cell + .analysis-weight-cell {
    border-top: 1px solid var(--border);
  }

  .analysis-improvement {
    width: fit-content;
  }
}
</style>
