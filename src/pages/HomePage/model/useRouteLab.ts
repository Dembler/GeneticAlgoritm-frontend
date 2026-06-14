import { computed, onMounted, ref, shallowRef, watch } from 'vue'
import { toast } from 'vue-sonner'

import { buildRoute, getRun, listRuns } from '@/shared/api/routes.api'
import type { ApiError } from '@/shared/api/types'
import type { RouteRequest, RouteResponse, RouteRunListItem } from '@/shared/api/route.types'

import type { DraftJsonState } from '../types'
import { createDefaultRouteDraft } from './defaultRouteDraft'
import { validateRouteDraft } from './routeSchema'

function cloneDraft(payload: RouteRequest): RouteRequest {
  return JSON.parse(JSON.stringify(payload)) as RouteRequest
}

function errorMessage(error: unknown) {
  if (typeof error === 'object' && error && 'message' in error) {
    return String((error as ApiError).message)
  }

  return 'Не удалось выполнить операцию.'
}

function validationMessage(value: unknown) {
  const validation = validateRouteDraft(value)

  if (validation.success) {
    return null
  }

  return [...new Set(validation.error.issues.map((issue) => issue.message))].join(' ')
}

function draftFingerprint(value: RouteRequest | null) {
  return value ? JSON.stringify(value) : ''
}

export function useRouteLab() {
  const draft = ref<RouteRequest | null>(createDefaultRouteDraft())
  const result = shallowRef<RouteResponse | null>(null)
  const runs = ref<RouteRunListItem[]>([])
  const jsonState = ref<DraftJsonState>({ value: '', error: null })
  const running = ref(false)
  const loadingRuns = ref(false)
  const runsError = ref<string | null>(null)
  const error = ref<string | null>(null)
  const selectedAlternativeRank = ref<number | null>(null)
  const resultDraftFingerprint = ref<string | null>(null)

  const canRun = computed(() => Boolean(draft.value && !running.value))

  function syncJsonFromDraft() {
    jsonState.value = {
      value: draft.value ? JSON.stringify(draft.value, null, 2) : '',
      error: null,
    }
  }

  function resetDraft() {
    error.value = null
    result.value = null
    resultDraftFingerprint.value = null
    selectedAlternativeRank.value = null
    draft.value = createDefaultRouteDraft()
    syncJsonFromDraft()
  }

  function applyScenarioState(nextDraft: RouteRequest) {
    error.value = null
    result.value = null
    resultDraftFingerprint.value = null
    selectedAlternativeRank.value = null
    draft.value = cloneDraft(nextDraft)
    syncJsonFromDraft()
  }

  function applyScenario(nextDraft: RouteRequest) {
    applyScenarioState(nextDraft)
    toast.success('Сценарий применен. Можно запускать расчет.')
  }

  async function runScenario(nextDraft: RouteRequest) {
    applyScenarioState(nextDraft)
    await runRoute()
  }

  function applyJsonDraft() {
    try {
      const parsed = JSON.parse(jsonState.value.value) as RouteRequest
      const validationError = validationMessage(parsed)

      if (validationError) {
        jsonState.value.error = validationError
        return false
      }

      draft.value = cloneDraft(parsed)
      result.value = null
      resultDraftFingerprint.value = null
      selectedAlternativeRank.value = null
      jsonState.value.error = null
      toast.success('JSON применен к настройкам.')
      return true
    } catch {
      jsonState.value.error = 'JSON содержит синтаксическую ошибку.'
      return false
    }
  }

  async function runRoute() {
    if (!draft.value) {
      return
    }

    const validationError = validationMessage(draft.value)

    if (validationError) {
      error.value = validationError
      toast.error(validationError)
      return
    }

    running.value = true
    error.value = null
    selectedAlternativeRank.value = null

    try {
      result.value = await buildRoute(cloneDraft(draft.value))
      resultDraftFingerprint.value = draftFingerprint(draft.value)
      syncJsonFromDraft()
      toast.success('Маршрут рассчитан.')
      await refreshRuns()
    } catch (currentError) {
      error.value = errorMessage(currentError)
      toast.error(error.value)
    } finally {
      running.value = false
    }
  }

  async function refreshRuns() {
    loadingRuns.value = true
    runsError.value = null

    try {
      runs.value = await listRuns(20)
    } catch (currentError) {
      runsError.value = errorMessage(currentError)
    } finally {
      loadingRuns.value = false
    }
  }

  async function openRun(runId: string) {
    loadingRuns.value = true
    error.value = null

    try {
      const details = await getRun(runId)
      draft.value = cloneDraft(details.request)
      result.value = details.response
      resultDraftFingerprint.value = draftFingerprint(draft.value)
      selectedAlternativeRank.value = null
      syncJsonFromDraft()
      toast.success('Запуск загружен из истории.')
    } catch (currentError) {
      error.value = errorMessage(currentError)
      toast.error(error.value)
    } finally {
      loadingRuns.value = false
    }
  }

  onMounted(() => {
    syncJsonFromDraft()
    void refreshRuns()
  })

  watch(
    () => draftFingerprint(draft.value),
    (fingerprint) => {
      if (
        !result.value ||
        !resultDraftFingerprint.value ||
        fingerprint === resultDraftFingerprint.value
      ) {
        return
      }

      result.value = null
      resultDraftFingerprint.value = null
      selectedAlternativeRank.value = null
    },
    { flush: 'post' },
  )

  return {
    draft,
    result,
    runs,
    jsonState,
    running,
    loadingRuns,
    runsError,
    error,
    selectedAlternativeRank,
    canRun,
    resetDraft,
    applyScenario,
    runScenario,
    syncJsonFromDraft,
    applyJsonDraft,
    runRoute,
    refreshRuns,
    openRun,
  }
}
