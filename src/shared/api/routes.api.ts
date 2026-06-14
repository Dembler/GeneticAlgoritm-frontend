import { endpoints } from './endpoints'
import { request } from './http'
import type { RouteRequest, RouteResponse, RouteRunDetails, RouteRunListItem } from './route.types'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function numberField(source: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = source[key]

    if (typeof value === 'number' && Number.isFinite(value)) {
      return value
    }
  }

  return null
}

function stringField(source: Record<string, unknown>, keys: string[], fallback = '') {
  for (const key of keys) {
    const value = source[key]

    if (typeof value === 'string' && value.trim()) {
      return value
    }
  }

  return fallback
}

function normalizeRouteResponse(response: RouteResponse): RouteResponse {
  return {
    ...response,
    ordered_points: Array.isArray(response.ordered_points) ? response.ordered_points : [],
    geometry: Array.isArray(response.geometry) ? response.geometry : [],
    geojson: response.geojson ?? {},
    provider: response.provider ?? 'unknown',
    alternatives: Array.isArray(response.alternatives) ? response.alternatives : [],
    segment_factors: Array.isArray(response.segment_factors) ? response.segment_factors : [],
    segment_insights: Array.isArray(response.segment_insights) ? response.segment_insights : [],
    population_memory_orders: Array.isArray(response.population_memory_orders)
      ? response.population_memory_orders
      : [],
  }
}

function normalizeRunListItem(item: RouteRunListItem): RouteRunListItem {
  const source: Record<string, unknown> = isRecord(item) ? item : {}
  const provider = stringField(source, ['provider_summary', 'provider'], 'unknown')
  const feasibleRaw = source.feasible
  const feasible = typeof feasibleRaw === 'boolean' ? feasibleRaw : null
  const feasibleCount = numberField(source, ['feasible_count'])

  return {
    ...item,
    provider_summary: provider,
    provider: stringField(source, ['provider'], provider),
    distance_km: numberField(source, ['distance_km', 'optimized_distance_km']),
    duration_min: numberField(source, ['duration_min', 'optimized_duration_min']),
    operational_cost: numberField(source, ['operational_cost']),
    objective_score: numberField(source, ['objective_score']),
    points_count: numberField(source, ['points_count']),
    priority_profile: stringField(source, ['priority_profile'], ''),
    vehicle_class: stringField(source, ['vehicle_class'], ''),
    cargo_profile: stringField(source, ['cargo_profile'], ''),
    improvement_pct: numberField(source, ['improvement_pct', 'objective_improvement_pct']),
    feasible,
    feasible_count: feasibleCount ?? (feasible ? 1 : 0),
  }
}

export function buildRoute(payload: RouteRequest): Promise<RouteResponse> {
  return request<RouteResponse>(endpoints.routes, {
    method: 'POST',
    body: JSON.stringify(payload),
  }).then(normalizeRouteResponse)
}

export function listRuns(limit = 20): Promise<RouteRunListItem[]> {
  return request<RouteRunListItem[]>(`${endpoints.runs}?limit=${limit}`).then((items) =>
    items.map(normalizeRunListItem),
  )
}

export function getRun(runId: string): Promise<RouteRunDetails> {
  return request<RouteRunDetails>(endpoints.run(runId)).then((details) => ({
    ...details,
    response: normalizeRouteResponse(details.response),
  }))
}

export function getRunReportUrl(runId: string) {
  return `${endpoints.runReport(runId)}`
}

export function getRunReportPdfUrl(runId: string) {
  return `${endpoints.runReportPdf(runId)}`
}

export function getOpenApiSchema(): Promise<Record<string, unknown>> {
  return request<Record<string, unknown>>(endpoints.schema)
}
