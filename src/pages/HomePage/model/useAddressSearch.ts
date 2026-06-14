import { shallowRef } from 'vue'
import { useDebounceFn } from '@vueuse/core'

export type AddressSuggestion = {
  id: string
  label: string
  lat: number
  lon: number
}

type NominatimItem = {
  place_id: number
  display_name: string
  lat: string
  lon: string
}

export function useAddressSearch() {
  const suggestions = shallowRef<AddressSuggestion[]>([])
  const loading = shallowRef(false)
  const error = shallowRef<string | null>(null)

  async function searchAddress(query: string) {
    const trimmedQuery = query.trim()

    if (trimmedQuery.length < 3) {
      suggestions.value = []
      error.value = null
      return
    }

    loading.value = true
    error.value = null

    try {
      const params = new URLSearchParams({
        q: trimmedQuery,
        format: 'jsonv2',
        limit: '5',
        'accept-language': 'ru',
      })
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?${params.toString()}`,
      )

      if (!response.ok) {
        throw new Error('address search failed')
      }

      const data = (await response.json()) as NominatimItem[]
      suggestions.value = data
        .map((item) => ({
          id: String(item.place_id),
          label: item.display_name,
          lat: Number(item.lat),
          lon: Number(item.lon),
        }))
        .filter((item) => Number.isFinite(item.lat) && Number.isFinite(item.lon))
    } catch {
      suggestions.value = []
      error.value = 'Не удалось загрузить адреса.'
    } finally {
      loading.value = false
    }
  }

  const debouncedSearchAddress = useDebounceFn(searchAddress, 350)

  function clearSuggestions() {
    suggestions.value = []
  }

  return {
    suggestions,
    loading,
    error,
    searchAddress: debouncedSearchAddress,
    clearSuggestions,
  }
}
