<script setup lang="ts">
import { computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useLocalStorage } from '@vueuse/core'
import { Moon, Sun } from 'lucide-vue-next'

import {
  Badge,
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
import { getStoredLocale, isSupportedLocale, localeStorageKey, type Locale } from '@/shared/i18n'
import { applyTheme, getStoredTheme, isAppTheme, themeStorageKey, type AppTheme } from '@/app/theme'

const { locale, t } = useI18n({ useScope: 'global' })
const selectedLocale = useLocalStorage<Locale>(localeStorageKey, getStoredLocale())
const selectedTheme = useLocalStorage<AppTheme>(themeStorageKey, getStoredTheme())

const isDarkTheme = computed({
  get: () => selectedTheme.value === 'dark',
  set: (checked: boolean) => {
    selectedTheme.value = checked ? 'dark' : 'light'
  },
})
const themeStateLabel = computed(() =>
  selectedTheme.value === 'dark' ? t('settings.themeDark') : t('settings.themeLight'),
)

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
</script>

<template>
  <div class="grid min-w-0 gap-5">
    <header>
      <Badge variant="outline" class="mb-2">{{ t('settings.badge') }}</Badge>
      <h1 class="text-2xl font-semibold text-foreground">{{ t('settings.title') }}</h1>
    </header>

    <div class="grid gap-5">
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
              <div class="theme-toggle-control">
                <span class="theme-toggle-label">{{ themeStateLabel }}</span>
                <Switch
                  v-model="isDarkTheme"
                  class="theme-switch"
                  :aria-label="t('settings.themeSwitchAria')"
                >
                  <template #thumb>
                    <Moon v-if="isDarkTheme" class="size-3" />
                    <Sun v-else class="size-3" />
                  </template>
                </Switch>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  </div>
</template>

<style scoped>
.theme-toggle-control {
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  gap: 0.75rem;
}

.theme-toggle-label {
  color: var(--foreground);
  font-size: 0.8125rem;
  font-weight: 600;
  white-space: nowrap;
}

.theme-switch {
  width: 3rem;
  height: 1.75rem;
  border: 1px solid var(--border);
  background: var(--muted);
  box-shadow: inset 0 0 0 1px color-mix(in oklch, var(--foreground) 5%, transparent);
}

.theme-switch[data-state='checked'] {
  border-color: color-mix(in oklch, var(--primary) 46%, var(--border));
  background: var(--primary);
}

.theme-switch :deep([data-slot='switch-thumb']) {
  display: inline-flex;
  width: 1.375rem;
  height: 1.375rem;
  align-items: center;
  justify-content: center;
  color: var(--foreground);
  box-shadow: 0 1px 4px hsl(0 0% 0% / 0.18);
}

.theme-switch[data-state='checked'] :deep([data-slot='switch-thumb']) {
  color: var(--primary);
}

@media (max-width: 420px) {
  .theme-toggle-control {
    width: 100%;
    justify-content: space-between;
  }
}
</style>
