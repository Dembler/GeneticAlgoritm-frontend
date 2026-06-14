<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { BarChart3, Clock3, Map, Route, Settings } from 'lucide-vue-next'

import { Badge, Button } from '@/shared/ui'
import { cn } from '@/shared/lib/utils'

export type ServiceSection = 'route' | 'analysis' | 'history' | 'settings'

defineProps<{
  activeSection: ServiceSection
  analysisAvailable: boolean
}>()

const emit = defineEmits<{
  select: [section: ServiceSection]
}>()

const { t } = useI18n({ useScope: 'global' })

const navigationItems = [
  { id: 'route', labelKey: 'navigation.route', icon: Route },
  { id: 'analysis', labelKey: 'navigation.analysis', icon: BarChart3 },
  { id: 'history', labelKey: 'navigation.history', icon: Clock3 },
  { id: 'settings', labelKey: 'navigation.settings', icon: Settings },
] satisfies Array<{
  id: ServiceSection
  labelKey: string
  icon: typeof Route
}>
</script>

<template>
  <aside class="service-sidebar">
    <div class="flex items-center gap-3 px-3">
      <div
        class="flex size-10 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm"
      >
        <Map class="size-5" />
      </div>
      <div class="min-w-0">
        <p class="truncate text-sm font-semibold text-foreground">{{ t('common.appName') }}</p>
        <p class="truncate text-xs text-muted-foreground">{{ t('common.appSubtitle') }}</p>
      </div>
    </div>

    <nav class="mt-8 flex flex-col gap-1 px-2">
      <Button
        v-for="item in navigationItems"
        :key="item.id"
        variant="ghost"
        :disabled="item.id === 'analysis' && !analysisAvailable"
        :class="
          cn(
            'h-10 justify-start gap-3 rounded-lg px-3 text-sm text-muted-foreground',
            activeSection === item.id &&
              'bg-primary/10 text-primary hover:bg-primary/10 hover:text-primary',
          )
        "
        @click="emit('select', item.id)"
      >
        <component :is="item.icon" class="size-4" />
        {{ t(item.labelKey) }}
      </Button>
    </nav>

    <div class="mt-auto px-3">
      <div class="rounded-xl border bg-card p-3 shadow-sm">
        <div class="flex items-center justify-between gap-3">
          <div>
            <p class="text-xs font-medium text-foreground">{{ t('sidebar.currentRequest') }}</p>
            <p class="mt-1 text-xs leading-5 text-muted-foreground">
              {{ t('sidebar.currentRequestDescription') }}
            </p>
          </div>
          <Badge variant="secondary">SPA</Badge>
        </div>
      </div>
    </div>
  </aside>
</template>

<style scoped>
.service-sidebar {
  position: sticky;
  top: 0;
  height: 100vh;
  width: 14.5rem;
  flex-direction: column;
  border-right: 1px solid var(--border);
  background: color-mix(in oklch, var(--card) 94%, var(--background) 6%);
  padding: 1.25rem 0.75rem;
  box-shadow: 0 18px 50px hsl(0 0% 0% / 0.04);
}
</style>
