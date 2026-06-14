import { endpoints } from './endpoints'
import { request } from './http'

export type HealthStatus = {
  status: string
  version?: string | null
  time?: string | null
  services?: Record<string, string>
}

export type IntegrationStatus = {
  name: string
  enabled: boolean
  status: string
  source: string
  fallback: string
  last_check_at?: string | null
}

function normalizeIntegration(item: IntegrationStatus): IntegrationStatus {
  return {
    name: item.name,
    enabled: Boolean(item.enabled),
    status: item.status || 'unknown',
    source: item.source || 'not reported',
    fallback: item.fallback || 'not reported',
    last_check_at: item.last_check_at ?? null,
  }
}

export function getHealthStatus(): Promise<HealthStatus> {
  return request<HealthStatus>(endpoints.health)
}

export function getIntegrationsStatus(): Promise<IntegrationStatus[]> {
  return request<IntegrationStatus[]>(endpoints.integrationsStatus).then((items) =>
    Array.isArray(items) ? items.map(normalizeIntegration) : [],
  )
}
