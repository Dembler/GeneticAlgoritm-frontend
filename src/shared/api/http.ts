import { API_BASE_URL } from './endpoints'
import type { ApiError } from './types'

function formatApiDetail(detail: unknown) {
  if (typeof detail === 'string') {
    return detail
  }

  if (Array.isArray(detail)) {
    const messages = detail
      .map((item) => {
        if (typeof item === 'object' && item && 'msg' in item) {
          const message = String(item.msg)

          if (message.includes('at most 64 characters')) {
            return 'Название или адрес точки должен быть не длиннее 64 символов.'
          }

          return message
        }

        return null
      })
      .filter((message): message is string => Boolean(message))

    if (messages.length) {
      return [...new Set(messages)].join(' ')
    }
  }

  return null
}

export async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers)

  if (!(init.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers,
  })

  if (!res.ok) {
    const body = await res.text()
    let message = body

    try {
      const parsed = JSON.parse(body) as {
        detail?: unknown
        message?: unknown
        error?: {
          code?: unknown
          message?: unknown
          details?: unknown
        }
      }
      const formattedDetail = formatApiDetail(parsed.detail)

      if (typeof parsed.error?.message === 'string') {
        message = parsed.error.message
      } else if (formattedDetail) {
        message = formattedDetail
      } else if (typeof parsed.message === 'string') {
        message = parsed.message
      } else if (parsed.detail) {
        message = JSON.stringify(parsed.detail)
      }
    } catch {
      message = body
    }

    throw {
      status: res.status,
      message: message || res.statusText,
    } satisfies ApiError
  }

  if (res.status === 204) {
    return undefined as T
  }

  return (await res.json()) as T
}
