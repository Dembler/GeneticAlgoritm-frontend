<script setup lang="ts">
import { computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useLocalStorage } from '@vueuse/core'
import { Moon, Sun } from 'lucide-vue-next'

import { Badge, Card, CardContent, CardHeader, CardTitle, Label, Switch } from '@/shared/ui'
import { applyTheme, getStoredTheme, isAppTheme, themeStorageKey, type AppTheme } from '@/app/theme'

const { t } = useI18n({ useScope: 'global' })
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
            <Label class="pt-1">{{ t('settings.themeLabel') }}</Label>
            <div class="theme-card">
              <div class="theme-card-copy">
                <div class="theme-card-icon">
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
.theme-card {
  display: grid;
  width: 100%;
  max-width: 28rem;
  gap: 1rem;
  border: 1px solid var(--border);
  border-radius: 0.75rem;
  background: var(--card);
  padding: 1rem;
}

.theme-card-copy {
  display: flex;
  min-width: 0;
  align-items: flex-start;
  gap: 0.75rem;
}

.theme-card-icon {
  display: flex;
  width: 2.5rem;
  height: 2.5rem;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--border);
  border-radius: 0.75rem;
  background: var(--secondary);
  color: var(--secondary-foreground);
}

.theme-toggle-control {
  display: flex;
  width: 100%;
  flex-shrink: 0;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  border: 1px solid var(--border);
  border-radius: 0.75rem;
  background: var(--background);
  padding: 0.5rem 0.625rem 0.5rem 0.75rem;
}

.theme-toggle-label {
  color: var(--foreground);
  font-size: 0.8125rem;
  font-weight: 600;
  white-space: nowrap;
}

.theme-switch {
  --theme-switch-width: 3.25rem;
  --theme-switch-thumb-size: 1.375rem;
  --theme-switch-thumb-offset: 0.1875rem;

  position: relative;
  box-sizing: border-box;
  width: var(--theme-switch-width);
  height: 1.875rem;
  flex-shrink: 0;
  overflow: hidden;
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
  width: var(--theme-switch-thumb-size);
  height: var(--theme-switch-thumb-size);
  align-items: center;
  justify-content: center;
  color: var(--foreground);
  translate: none;
  transform: translateX(var(--theme-switch-thumb-offset));
  box-shadow: 0 1px 4px hsl(0 0% 0% / 0.18);
}

.theme-switch[data-state='checked'] :deep([data-slot='switch-thumb']) {
  color: var(--primary);
  translate: none;
  transform: translateX(
    calc(
      var(--theme-switch-width) - var(--theme-switch-thumb-size) -
        (var(--theme-switch-thumb-offset) * 2)
    )
  );
}

@media (min-width: 520px) {
  .theme-card {
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: center;
  }

  .theme-toggle-control {
    width: auto;
    min-width: 8.75rem;
  }
}
</style>
