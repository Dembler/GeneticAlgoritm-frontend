import type { RouteRequest } from '@/shared/api/route.types'

export type RequestDraft = RouteRequest

export type DraftJsonState = {
  value: string
  error: string | null
}
