<script setup lang="ts">
import { computed, ref } from 'vue'
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

type MatrixValue = number | boolean | null
type MatrixSection = {
  key: string
  title: string
  description: string
  matrix: MatrixValue[][]
}

const researcherMode = ref(false)

const criteriaLabels: Record<keyof CriteriaWeights, string> = {
  distance: 'Расстояние',
  duration: 'Время движения',
  fuel_cost: 'Стоимость топлива',
  emissions: 'Выбросы CO2',
  congestion: 'Трафик',
  weather_risk: 'Погодный фактор',
  reliability: 'Надежность',
  safety: 'Безопасность',
  tolls: 'Платные дороги',
  road_quality: 'Качество дороги',
  dynamic_events: 'Дорожные события',
  operational_cost: 'Полная стоимость',
  cargo_risk: 'Грузовой фактор',
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
      label: 'Расстояние',
      baseline: `${formatNumber(comparison.baseline_metrics.distance_km, 1)} км`,
      optimized: `${formatNumber(comparison.optimized_metrics.distance_km, 1)} км`,
      delta: `${formatNumber(comparison.delta.distance_km, 1)} км`,
      improvement: formatImprovement(comparison.improvement_pct.distance_km, 1),
    },
    {
      label: 'Время',
      baseline: formatDuration(comparison.baseline_metrics.duration_min),
      optimized: formatDuration(comparison.optimized_metrics.duration_min),
      delta: formatDuration(Math.abs(comparison.delta.duration_min)),
      improvement: formatImprovement(comparison.improvement_pct.duration_min, 1),
    },
    {
      label: 'Полная стоимость',
      baseline: formatMoney(comparison.baseline_metrics.operational_cost, currency.value, true),
      optimized: formatMoney(comparison.optimized_metrics.operational_cost, currency.value, true),
      delta: formatMoney(comparison.delta.operational_cost, currency.value, true),
      improvement: formatImprovement(comparison.improvement_pct.operational_cost, 1),
    },
    {
      label: 'Выбросы CO2',
      baseline: `${formatNumber(comparison.baseline_metrics.co2_kg, 1)} кг`,
      optimized: `${formatNumber(comparison.optimized_metrics.co2_kg, 1)} кг`,
      delta: `${formatNumber(comparison.delta.co2_kg, 1)} кг`,
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
      label: 'Экономия расстояния',
      value: formatImprovement(comparison.improvement_pct.distance_km, 1),
      detail: `${formatNumber(Math.abs(comparison.delta.distance_km), 1)} км`,
      icon: Route,
      accent: 'blue',
    },
    {
      label: 'Экономия времени',
      value: formatImprovement(comparison.improvement_pct.duration_min, 1),
      detail: formatDuration(Math.abs(comparison.delta.duration_min)),
      icon: Activity,
      accent: 'emerald',
    },
    {
      label: 'Итоговая стоимость',
      value: formatMoney(current.operational_cost, currency.value, true),
      detail: `${formatImprovement(comparison.improvement_pct.operational_cost, 1)} к исходному`,
      icon: Scale,
      accent: 'amber',
    },
    {
      label: 'Источник данных',
      value: formatDataSource(props.result?.data_sources?.routing ?? props.result?.provider),
      detail: props.result?.data_confidence
        ? `достоверность ${formatPercent(props.result.data_confidence.score, 1)}`
        : 'нет оценки достоверности',
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

  return (Object.keys(criteriaLabels) as Array<keyof CriteriaWeights>)
    .map((key) => ({
      key,
      label: criteriaLabels[key],
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
      'Матрица расстояний, км',
      'Базовые расстояния между всеми точками.',
      matrices.distance_km,
    ),
    matrixSection(
      'duration_min',
      'Матрица времени, мин',
      'Базовое время движения до учета дорожных факторов.',
      matrices.duration_min,
    ),
    matrixSection(
      'traffic_index',
      'Матрица трафика',
      'Индекс загруженности ребра от 0 до 1.',
      matrices.traffic_index,
    ),
    matrixSection(
      'road_quality',
      'Матрица качества дороги',
      'Качество покрытия: 1 лучше, 0 хуже.',
      matrices.road_quality,
    ),
    matrixSection(
      'incident_risk',
      'Матрица дорожных событий',
      'Оценка происшествий на ребрах графа.',
      matrices.incident_risk,
    ),
    matrixSection(
      'infrastructure_access',
      'Матрица ограничений транспорта',
      'Можно ли проехать с заданными параметрами транспорта.',
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
    return '—'
  }

  if (typeof value === 'boolean') {
    return value ? 'Да' : 'Нет'
  }

  return formatNumber(value, Math.abs(value) >= 100 ? 0 : 2)
}

function formatPointOrder(points: Array<{ label?: string | null }>) {
  if (!points.length) {
    return '—'
  }

  return points.map((point, index) => point.label || `Точка ${index + 1}`).join(' -> ')
}
</script>

<template>
  <div v-if="result" class="analysis-workspace grid min-w-0 gap-5">
    <header class="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
      <div class="grid gap-2">
        <Badge variant="outline" class="w-fit">Текущий запуск</Badge>
        <h1 class="text-2xl font-semibold tracking-normal text-foreground">Анализ маршрута</h1>
        <p class="max-w-[64rem] text-sm leading-6 text-muted-foreground">
          В обычном режиме показаны результат оптимизации, активные критерии и понятное описание
          оценки. Технические детали доступны в режиме исследователя.
        </p>
      </div>
      <label class="flex items-center gap-3 rounded-lg border bg-card px-3 py-2 text-sm">
        <Switch v-model="researcherMode" aria-label="Режим исследователя" />
        <span>Режим исследователя</span>
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
        <CardTitle class="text-base">Результат оптимизации</CardTitle>
      </CardHeader>
      <CardContent class="grid gap-4">
        <div class="grid gap-3 lg:grid-cols-2">
          <div class="analysis-route-card analysis-route-card--baseline">
            <p class="text-xs font-medium uppercase text-muted-foreground">Исходный маршрут</p>
            <p class="mt-2 text-sm leading-6 text-foreground">{{ routeOrder.baseline }}</p>
          </div>
          <div class="analysis-route-card analysis-route-card--optimized">
            <p class="text-xs font-medium uppercase text-muted-foreground">Выбранный маршрут</p>
            <p class="mt-2 text-sm leading-6 text-foreground">{{ routeOrder.optimized }}</p>
          </div>
        </div>

        <ScrollArea class="analysis-table-scroll w-full">
          <Table class="analysis-comparison-table">
            <TableHeader>
              <TableRow>
                <TableHead>Показатель</TableHead>
                <TableHead>Исходный</TableHead>
                <TableHead>Выбранный</TableHead>
                <TableHead>Разница</TableHead>
                <TableHead>Улучшение</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow
                v-for="row in comparisonRows"
                :key="row.label"
                class="analysis-comparison-row"
              >
                <TableCell class="analysis-comparison-cell font-medium" data-label="Показатель">
                  {{ row.label }}
                </TableCell>
                <TableCell class="analysis-comparison-cell" data-label="Исходный">
                  {{ row.baseline }}
                </TableCell>
                <TableCell class="analysis-comparison-cell" data-label="Выбранный">
                  {{ row.optimized }}
                </TableCell>
                <TableCell class="analysis-comparison-cell" data-label="Разница">
                  {{ row.delta }}
                </TableCell>
                <TableCell class="analysis-comparison-cell" data-label="Улучшение">
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
          Как получен результат
        </CardTitle>
      </CardHeader>
      <CardContent class="p-0">
        <Tabs default-value="criteria" class="gap-0">
          <div class="border-y bg-muted/40 px-4 py-2">
            <TabsList class="flex h-auto flex-wrap justify-start">
              <TabsTrigger value="criteria">
                <Scale data-icon="inline-start" />
                Критерии и веса
              </TabsTrigger>
              <TabsTrigger value="score">
                <Calculator data-icon="inline-start" />
                Целевая функция
              </TabsTrigger>
              <TabsTrigger v-if="researcherMode" value="matrices">
                <Grid3X3 data-icon="inline-start" />
                Матрицы
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="criteria" class="m-0 grid gap-4 p-4">
            <div
              class="rounded-lg border bg-background/70 p-3 text-sm leading-6 text-muted-foreground"
            >
              В обычном режиме показаны только активные критерии. Нулевые критерии скрыты, чтобы не
              выглядеть как ошибка.
            </div>

            <div class="flex flex-wrap gap-2">
              <Badge v-for="trigger in dynamicTriggers" :key="trigger" variant="secondary">
                {{ translateTrigger(trigger) }}
              </Badge>
              <span v-if="!dynamicTriggers.length" class="text-sm text-muted-foreground">
                Динамические триггеры не применялись.
              </span>
            </div>

            <ScrollArea class="analysis-weight-scroll w-full">
              <Table class="analysis-weight-table">
                <TableHeader>
                  <TableRow>
                    <TableHead>Критерий</TableHead>
                    <TableHead>Базовый вес</TableHead>
                    <TableHead>Итоговый вес</TableHead>
                    <TableHead>Изменение</TableHead>
                    <TableHead v-if="researcherMode">Комментарий</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow v-for="row in weightRows" :key="row.key" class="analysis-weight-row">
                    <TableCell class="analysis-weight-cell font-medium" data-label="Критерий">
                      {{ row.label }}
                    </TableCell>
                    <TableCell class="analysis-weight-cell" data-label="Базовый вес">
                      {{ formatNumber(row.base, 4) }}
                    </TableCell>
                    <TableCell class="analysis-weight-cell" data-label="Итоговый вес">
                      {{ formatNumber(row.adjusted, 4) }}
                    </TableCell>
                    <TableCell
                      class="analysis-weight-cell"
                      data-label="Изменение"
                      :class="
                        row.delta >= 0 ? 'text-positive-foreground' : 'text-negative-foreground'
                      "
                    >
                      {{ row.delta >= 0 ? '+' : '' }}{{ formatNumber(row.delta, 4) }}
                    </TableCell>
                    <TableCell
                      v-if="researcherMode"
                      class="analysis-weight-cell text-muted-foreground"
                      data-label="Комментарий"
                    >
                      {{
                        row.active
                          ? 'Участвует в целевой функции'
                          : 'Информационная метрика, не участвует в целевой функции'
                      }}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="score" class="m-0 grid gap-4 p-4">
            <div class="rounded-lg border bg-background/70 p-3">
              <p class="text-sm font-medium text-foreground">Описание оценки маршрута</p>
              <p v-if="!researcherMode" class="mt-2 text-sm leading-6 text-muted-foreground">
                Маршрут оценивается по трем основным критериям: расстояние, время в пути и полная
                стоимость. Чем меньше итоговая оценка, тем лучше маршрут.
              </p>
              <code
                v-else
                class="mt-2 block overflow-x-auto rounded-md bg-muted px-3 py-2 text-xs text-foreground"
              >
                score = Σ(weight_i * normalized_metric_i) + constraint_penalty
              </code>
            </div>

            <div v-if="researcherMode" class="analysis-score-grid grid gap-4 xl:grid-cols-2">
              <section class="analysis-score-section rounded-lg border">
                <div class="border-b px-3 py-2 text-sm font-medium">Выбранный маршрут</div>
                <ScrollArea class="analysis-score-scroll w-full">
                  <Table class="analysis-score-table">
                    <TableHeader>
                      <TableRow>
                        <TableHead>Компонент</TableHead>
                        <TableHead>Исходное</TableHead>
                        <TableHead>Норма</TableHead>
                        <TableHead>Вес</TableHead>
                        <TableHead>Вклад</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow v-for="row in scoreRows" :key="row.key" class="analysis-score-row">
                        <TableCell class="analysis-score-cell font-medium" data-label="Компонент">{{ row.label }}</TableCell>
                        <TableCell class="analysis-score-cell" data-label="Исходное">{{ formatNumber(row.raw_value, 3) }}</TableCell>
                        <TableCell class="analysis-score-cell" data-label="Норма">{{ formatNumber(row.normalized_value, 3) }}</TableCell>
                        <TableCell class="analysis-score-cell" data-label="Вес">{{ formatNumber(row.weight, 4) }}</TableCell>
                        <TableCell class="analysis-score-cell" data-label="Вклад">{{ formatNumber(row.contribution, 4) }}</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </ScrollArea>
              </section>

              <section class="analysis-score-section rounded-lg border">
                <div class="border-b px-3 py-2 text-sm font-medium">Исходный маршрут</div>
                <ScrollArea class="analysis-score-scroll w-full">
                  <Table class="analysis-score-table">
                    <TableHeader>
                      <TableRow>
                        <TableHead>Компонент</TableHead>
                        <TableHead>Исходное</TableHead>
                        <TableHead>Норма</TableHead>
                        <TableHead>Вес</TableHead>
                        <TableHead>Вклад</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow
                        v-for="row in baselineScoreRows"
                        :key="row.key"
                        class="analysis-score-row"
                      >
                        <TableCell class="analysis-score-cell font-medium" data-label="Компонент">{{ row.label }}</TableCell>
                        <TableCell class="analysis-score-cell" data-label="Исходное">{{ formatNumber(row.raw_value, 3) }}</TableCell>
                        <TableCell class="analysis-score-cell" data-label="Норма">{{ formatNumber(row.normalized_value, 3) }}</TableCell>
                        <TableCell class="analysis-score-cell" data-label="Вес">{{ formatNumber(row.weight, 4) }}</TableCell>
                        <TableCell class="analysis-score-cell" data-label="Вклад">{{ formatNumber(row.contribution, 4) }}</TableCell>
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
              Backend не вернул матрицы для этого запуска.
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
                      <TableHead class="sticky left-0 z-10 bg-card">Из / в</TableHead>
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
                        {{ pointLabels[rowIndex] ?? `Точка ${rowIndex + 1}` }}
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
        <CardTitle class="text-base">Альтернативы и диагностика</CardTitle>
      </CardHeader>
      <CardContent class="grid gap-4">
        <div class="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          <div
            v-for="alternative in result.alternatives"
            :key="alternative.rank"
            class="rounded-lg border p-3"
          >
            <div class="mb-2 flex items-center justify-between gap-2">
              <p class="text-sm font-medium">Альтернатива {{ alternative.rank }}</p>
              <Button
                variant="outline"
                size="sm"
                @click="
                  selectedAlternativeRank =
                    selectedAlternativeRank === alternative.rank ? null : alternative.rank
                "
              >
                {{ selectedAlternativeRank === alternative.rank ? 'Скрыть' : 'На карте' }}
              </Button>
            </div>
            <div class="grid gap-1 text-xs text-muted-foreground">
              <span>{{ formatNumber(alternative.metrics.distance_km, 1) }} км</span>
              <span>{{ formatDuration(alternative.metrics.duration_min) }}</span>
              <span>{{ formatNumber(alternative.metrics.co2_kg, 1) }} кг CO2</span>
            </div>
          </div>
        </div>

        <div
          v-if="result.diagnostics"
          class="grid gap-2 rounded-lg border p-3 text-sm sm:grid-cols-2"
        >
          <span class="text-muted-foreground">Режим</span>
          <span>{{ result.diagnostics.mode }}</span>
          <span class="text-muted-foreground">Оценено решений</span>
          <span>{{ result.diagnostics.evaluated_solutions }}</span>
          <span class="text-muted-foreground">Исправлено решений</span>
          <span>{{ result.diagnostics.repaired_solutions }}</span>
          <span class="text-muted-foreground">Запрещенные ребра</span>
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
