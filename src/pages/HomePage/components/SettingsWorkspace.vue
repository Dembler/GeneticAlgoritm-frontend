<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useLocalStorage } from '@vueuse/core'
import { CheckCircle2, CircleMinus, Database, Moon, RefreshCw } from 'lucide-vue-next'

import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch,
} from '@/shared/ui'
import {
  getHealthStatus,
  getIntegrationsStatus,
  type HealthStatus,
  type IntegrationStatus,
} from '@/shared/api/system.api'
import type { ApiError } from '@/shared/api/types'
import { getStoredLocale, isSupportedLocale, localeStorageKey, type Locale } from '@/shared/i18n'
import { applyTheme, getStoredTheme, isAppTheme, themeStorageKey, type AppTheme } from '@/app/theme'
import { formatDataSource, formatIntegrationName } from '@/shared/lib/format/routePresentation'

const { locale, t, te } = useI18n({ useScope: 'global' })
const selectedLocale = useLocalStorage<Locale>(localeStorageKey, getStoredLocale())
const selectedTheme = useLocalStorage<AppTheme>(themeStorageKey, getStoredTheme())
const integrations = ref<IntegrationStatus[]>([])
const health = ref<HealthStatus | null>(null)
const loadingIntegrations = ref(false)
const integrationsError = ref<string | null>(null)

const englishIntegrationNames: Record<string, string> = {
  'OSRM Routing': 'OSRM Routing',
  Weather: 'Weather',
  Elevation: 'Elevation',
  Traffic: 'Traffic',
  'Road quality': 'Road quality',
  'Road events': 'Road events',
  'Infrastructure restrictions': 'Infrastructure restrictions',
  Tolls: 'Tolls',
  'Fuel prices': 'Fuel prices',
}

const englishSourceNames: Record<string, string> = {
  fallback: 'Fallback model',
  'synthetic fallback': 'Fallback model',
  'cached demo provider': 'Demo provider',
  'not configured': 'not configured',
  'Haversine matrix': 'Fallback model',
  'seasonal profile': 'seasonal profile',
  'synthetic congestion index': 'synthetic congestion index',
  backend: 'Backend',
}

const dateTimeLocale = computed(() => (locale.value === 'en' ? 'en-US' : 'ru-RU'))

const isDarkTheme = computed({
  get: () => selectedTheme.value === 'dark',
  set: (checked: boolean) => {
    selectedTheme.value = checked ? 'dark' : 'light'
  },
})

const translatedIntegrationsError = computed(() => {
  if (integrationsError.value === null) {
    return null
  }

  const message = integrationsError.value.trim()

  if (!message) {
    return t('settings.backendUnavailable')
  }

  if (message.toLowerCase() === 'not found') {
    return t('settings.integrationsNotFound')
  }

  return message
})

const dataSources = computed(() =>
  integrations.value.map((integration) => {
    const source = formatSourceName(integration.source)
    const fallback = formatSourceName(integration.fallback)

    return {
      label: formatIntegrationLabel(integration.name),
      mode: formatStatusLabel(integration.status),
      detail: t('settings.dataSourceDetail', { source, fallback }),
    }
  }),
)

function formatIntegrationLabel(value: string | null | undefined) {
  const normalized = value?.trim()

  if (!normalized) {
    return t('settings.integrationFallback')
  }

  return locale.value === 'en'
    ? (englishIntegrationNames[normalized] ?? normalized)
    : formatIntegrationName(normalized)
}

function formatSourceName(value: string | null | undefined) {
  const normalized = value?.trim()

  if (!normalized) {
    return t('settings.noData')
  }

  if (locale.value === 'en') {
    return (
      englishSourceNames[normalized] ?? englishSourceNames[normalized.toLowerCase()] ?? normalized
    )
  }

  return formatDataSource(normalized)
}

function formatStatusLabel(value: string | null | undefined) {
  const normalized = value?.trim().toLowerCase()

  if (!normalized) {
    return t('status.unknown')
  }

  const key = `status.${normalized}`

  return te(key) ? t(key) : normalized
}

function errorMessage(error: unknown) {
  if (typeof error === 'object' && error && 'message' in error) {
    return String((error as ApiError).message)
  }

  return ''
}

async function refreshIntegrations() {
  loadingIntegrations.value = true
  integrationsError.value = null

  try {
    const [nextHealth, nextIntegrations] = await Promise.all([
      getHealthStatus(),
      getIntegrationsStatus(),
    ])

    health.value = nextHealth
    integrations.value = nextIntegrations
  } catch (error) {
    integrationsError.value = errorMessage(error)
  } finally {
    loadingIntegrations.value = false
  }
}

function formatDateTime(value?: string | null) {
  if (!value) {
    return t('settings.noData')
  }

  const date = new Date(value)

  return Number.isNaN(date.getTime()) ? value : date.toLocaleString(dateTimeLocale.value)
}

watch(
  selectedLocale,
  (value) => {
    const nextLocale = isSupportedLocale(value) ? value : 'ru'

    if (nextLocale !== value) {
      selectedLocale.value = nextLocale
      return
    }

    locale.value = nextLocale

    if (typeof document !== 'undefined') {
      document.documentElement.lang = nextLocale
    }
  },
  { immediate: true },
)

watch(
  selectedTheme,
  (value) => {
    const nextTheme = isAppTheme(value) ? value : 'light'

    if (nextTheme !== value) {
      selectedTheme.value = nextTheme
      return
    }

    applyTheme(nextTheme)
  },
  { immediate: true },
)

onMounted(() => {
  void refreshIntegrations()
})
</script>

<template>
  <div class="grid min-w-0 gap-5">
    <header>
      <Badge variant="outline" class="mb-2">{{ t('settings.badge') }}</Badge>
      <h1 class="text-2xl font-semibold text-foreground">{{ t('settings.title') }}</h1>
    </header>

    <div class="grid gap-5 xl:grid-cols-[minmax(0,1fr)_24rem]">
      <Card>
        <CardHeader>
          <CardTitle class="text-base">{{ t('settings.mainTitle') }}</CardTitle>
        </CardHeader>
        <CardContent class="grid gap-5">
          <div class="grid gap-2 md:grid-cols-[13rem_minmax(0,1fr)] md:items-start">
            <Label class="pt-2">{{ t('settings.languageLabel') }}</Label>
            <div class="grid w-full max-w-[28rem] gap-2">
              <Select v-model="selectedLocale" :aria-label="t('settings.languageLabel')">
                <SelectTrigger class="h-10 w-full rounded-lg bg-input">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ru">{{ t('settings.languages.ru') }}</SelectItem>
                  <SelectItem value="en">{{ t('settings.languages.en') }}</SelectItem>
                </SelectContent>
              </Select>
              <p class="text-xs leading-5 text-muted-foreground">
                {{ t('settings.languageHint') }}
              </p>
            </div>
          </div>

          <div class="grid gap-2 md:grid-cols-[13rem_minmax(0,1fr)] md:items-start">
            <Label class="pt-1">{{ t('settings.themeLabel') }}</Label>
            <div
              class="flex w-full max-w-[28rem] items-center justify-between gap-4 rounded-lg border bg-card p-4"
            >
              <div class="flex min-w-0 flex-1 items-start gap-3">
                <div
                  class="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-secondary text-secondary-foreground"
                >
                  <Moon class="size-4" />
                </div>
                <p class="text-xs leading-5 text-muted-foreground">
                  {{ t('settings.themeHint') }}
                </p>
              </div>
              <Switch v-model="isDarkTheme" :aria-label="t('settings.themeSwitchAria')" />
            </div>
          </div>

          <div class="grid gap-2 md:grid-cols-[13rem_minmax(0,1fr)] md:items-start">
            <Label class="pt-1">{{ t('settings.backendLabel') }}</Label>
            <div class="grid w-full max-w-[28rem] gap-2 rounded-lg border bg-card p-4">
              <div class="flex flex-wrap items-center gap-2">
                <Badge :variant="health?.status === 'ok' ? 'secondary' : 'outline'">
                  {{ formatStatusLabel(health?.status) }}
                </Badge>
                <span class="text-sm text-muted-foreground">
                  {{ health?.version ? `v${health.version}` : t('settings.versionUnavailable') }}
                </span>
              </div>
              <p class="text-xs leading-5 text-muted-foreground">
                {{ t('settings.lastCheck', { value: formatDateTime(health?.time) }) }}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader class="flex flex-row items-center justify-between gap-3">
          <CardTitle class="text-base">{{ t('settings.integrationsTitle') }}</CardTitle>
          <Button
            variant="outline"
            size="sm"
            :disabled="loadingIntegrations"
            @click="refreshIntegrations"
          >
            <RefreshCw class="size-4" :class="loadingIntegrations && 'animate-spin'" />
            {{ t('settings.refresh') }}
          </Button>
        </CardHeader>
        <CardContent class="grid gap-3">
          <div
            v-if="translatedIntegrationsError"
            class="rounded-lg border border-dashed p-3 text-sm text-muted-foreground"
          >
            {{ translatedIntegrationsError }}
          </div>
          <div
            v-else-if="loadingIntegrations && !integrations.length"
            class="rounded-lg border border-dashed p-3 text-sm text-muted-foreground"
          >
            {{ t('settings.loadingIntegrations') }}
          </div>
          <div
            v-else-if="!integrations.length"
            class="rounded-lg border border-dashed p-3 text-sm text-muted-foreground"
          >
            {{ t('settings.integrationsEmpty') }}
          </div>
          <div
            v-for="integration in integrations"
            :key="integration.name"
            class="grid gap-3 rounded-lg border p-3"
          >
            <div class="flex items-center justify-between gap-3">
              <div class="flex min-w-0 items-center gap-3">
                <component
                  :is="integration.enabled ? CheckCircle2 : CircleMinus"
                  :class="
                    integration.enabled ? 'text-positive-foreground' : 'text-muted-foreground'
                  "
                  class="size-4 shrink-0"
                />
                <span class="truncate text-sm font-medium text-foreground">{{
                  formatIntegrationLabel(integration.name)
                }}</span>
              </div>
              <Badge :variant="integration.enabled ? 'secondary' : 'outline'" class="shrink-0">
                {{ integration.enabled ? t('settings.connected') : t('settings.disconnected') }}
              </Badge>
            </div>
            <div class="grid gap-1 text-xs leading-5 text-muted-foreground">
              <span>{{ t('settings.source') }}: {{ formatSourceName(integration.source) }}</span>
              <span
                >{{ t('settings.fallback') }}: {{ formatSourceName(integration.fallback) }}</span
              >
              <span>{{ t('settings.status') }}: {{ formatStatusLabel(integration.status) }}</span>
              <span>{{
                t('settings.lastCheck', { value: formatDateTime(integration.last_check_at) })
              }}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>

    <Card>
      <CardHeader>
        <CardTitle class="flex items-center gap-2 text-base">
          <Database class="size-4 text-primary" />
          {{ t('settings.dataSourcesTitle') }}
        </CardTitle>
      </CardHeader>
      <CardContent class="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        <div
          v-if="!dataSources.length"
          class="rounded-lg border border-dashed p-3 text-sm text-muted-foreground md:col-span-2 xl:col-span-3"
        >
          {{ t('settings.dataSourcesEmpty') }}
        </div>
        <div v-for="source in dataSources" :key="source.label" class="rounded-lg border p-3">
          <div class="flex items-center justify-between gap-3">
            <span class="text-sm font-medium text-foreground">{{ source.label }}</span>
            <Badge variant="outline">{{ source.mode }}</Badge>
          </div>
          <p class="mt-2 text-xs leading-5 text-muted-foreground">{{ source.detail }}</p>
        </div>
      </CardContent>
    </Card>
  </div>
</template>
