<script setup lang="ts">
import { computed, ref } from 'vue'
import { Search, SlidersHorizontal } from 'lucide-vue-next'

import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/ui'
import type { RouteRunListItem } from '@/shared/api/route.types'
import { formatNumber } from '@/shared/lib/format/number'
import {
  formatImprovement,
  formatMissing,
  formatProvider,
} from '@/shared/lib/format/routePresentation'

const props = defineProps<{
  runs: RouteRunListItem[]
  loading: boolean
  error?: string | null
}>()

const emit = defineEmits<{
  refresh: []
  openRun: [runId: string]
}>()

const dateFormatter = new Intl.DateTimeFormat('ru-RU', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
})

const query = ref('')
const feasibleFilter = ref('all')
const providerFilter = ref('all')

const providerOptions = computed(() => {
  const providers = new Set(props.runs.map((run) => run.provider_summary).filter(Boolean))

  return ['all', ...providers]
})

const filteredRuns = computed(() => {
  const normalizedQuery = query.value.trim().toLowerCase()

  return props.runs.filter((run) => {
    const runLike = run as RouteRunListItem & Record<string, unknown>
    const searchable = [
      run.run_id,
      run.provider_summary,
      runLike.case_type,
      runLike.priority_profile,
      runLike.vehicle_class,
      runLike.cargo_profile,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
    const matchesQuery = !normalizedQuery || searchable.includes(normalizedQuery)
    const matchesProvider =
      providerFilter.value === 'all' || run.provider_summary === providerFilter.value
    const matchesFeasible =
      feasibleFilter.value === 'all' ||
      (feasibleFilter.value === 'feasible' && Number(run.feasible_count) > 0) ||
      (feasibleFilter.value === 'infeasible' && Number(run.feasible_count) <= 0)

    return matchesQuery && matchesProvider && matchesFeasible
  })
})

function runNumber(run: RouteRunListItem, key: string) {
  const value = (run as RouteRunListItem & Record<string, unknown>)[key]

  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function formatDistance(value: number | null) {
  return value === null ? 'нет данных' : `${formatNumber(value, 1)} км`
}

function formatMinutes(value: number | null) {
  return value === null ? 'нет данных' : `${formatNumber(value, 0)} мин`
}

function formatScore(value: number | null | undefined) {
  return value === null || value === undefined ? 'нет данных' : formatNumber(value, 2)
}

function formatCreatedAt(value: string) {
  const date = new Date(value)

  return Number.isNaN(date.getTime()) ? value : dateFormatter.format(date)
}
</script>

<template>
  <div class="grid min-w-0 max-w-full gap-5 overflow-hidden">
    <header class="flex min-w-0 flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <div class="min-w-0">
        <Badge variant="outline" class="mb-2">Журнал расчетов</Badge>
        <h1 class="text-2xl font-semibold text-foreground">История запусков</h1>
        <p class="mt-1 text-sm text-muted-foreground">
          Список сохраненных запусков сервиса маршрутизации.
        </p>
      </div>

      <div class="flex w-full flex-wrap gap-2 lg:w-auto lg:justify-end">
        <div class="relative w-full sm:w-auto sm:min-w-64">
          <Search
            class="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            v-model="query"
            class="rounded-xl pl-9"
            placeholder="Поиск по запуску, типу, приоритету"
          />
        </div>
        <Select v-model="feasibleFilter" aria-label="Фильтр статуса">
          <SelectTrigger class="w-full rounded-xl sm:w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все статусы</SelectItem>
            <SelectItem value="feasible">Допустимые</SelectItem>
            <SelectItem value="infeasible">С ограничениями</SelectItem>
          </SelectContent>
        </Select>
        <Select v-model="providerFilter" aria-label="Фильтр провайдера">
          <SelectTrigger class="w-full rounded-xl sm:w-52">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem v-for="provider in providerOptions" :key="provider" :value="provider">
              {{ provider === 'all' ? 'Все провайдеры' : formatProvider(provider) }}
            </SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" class="w-full rounded-xl sm:w-auto" disabled>
          <SlidersHorizontal class="size-4" />
          Фильтры
        </Button>
        <Button class="w-full rounded-xl sm:w-auto" :disabled="loading" @click="emit('refresh')">
          Обновить
        </Button>
      </div>
    </header>

    <Card class="min-w-0 overflow-hidden">
      <CardHeader>
        <CardTitle class="text-base">Последние расчеты</CardTitle>
      </CardHeader>
      <CardContent class="min-w-0 overflow-hidden">
        <div v-if="error" class="rounded-xl border border-dashed p-5 text-sm text-muted-foreground">
          Backend недоступен для истории запусков.
        </div>

        <div
          v-else-if="!runs.length"
          class="rounded-xl border border-dashed p-5 text-sm text-muted-foreground"
        >
          История пока пустая. После первого успешного расчета здесь появятся сохраненные запуски.
        </div>

        <div
          v-else-if="!filteredRuns.length"
          class="rounded-xl border border-dashed p-5 text-sm text-muted-foreground"
        >
          По текущим фильтрам запусков не найдено.
        </div>

        <div v-else class="max-w-full overflow-x-auto">
          <Table class="min-w-[56rem]">
            <TableHeader>
              <TableRow>
                <TableHead>Дата запуска</TableHead>
                <TableHead>ID запуска</TableHead>
                <TableHead>Провайдер</TableHead>
                <TableHead>Расстояние</TableHead>
                <TableHead>Время</TableHead>
                <TableHead>Улучшение</TableHead>
                <TableHead>Оценка</TableHead>
                <TableHead>Допустимость</TableHead>
                <TableHead class="text-right">Действие</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow v-for="run in filteredRuns" :key="run.run_id">
                <TableCell>{{ formatCreatedAt(run.created_at) }}</TableCell>
                <TableCell class="font-medium">{{ run.run_id }}</TableCell>
                <TableCell>{{ formatProvider(run.provider_summary) }}</TableCell>
                <TableCell>{{ formatDistance(runNumber(run, 'distance_km')) }}</TableCell>
                <TableCell>{{ formatMinutes(runNumber(run, 'duration_min')) }}</TableCell>
                <TableCell>{{ formatImprovement(runNumber(run, 'improvement_pct'), 1) }}</TableCell>
                <TableCell>{{ formatMissing(formatScore(run.objective_score)) }}</TableCell>
                <TableCell>
                  <Badge :variant="Number(run.feasible_count) > 0 ? 'secondary' : 'outline'">
                    {{ Number(run.feasible_count) > 0 ? 'допустим' : 'нет данных' }}
                  </Badge>
                </TableCell>
                <TableCell class="text-right">
                  <Button
                    variant="outline"
                    size="sm"
                    class="rounded-xl"
                    @click="emit('openRun', run.run_id)"
                  >
                    Открыть
                  </Button>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  </div>
</template>
