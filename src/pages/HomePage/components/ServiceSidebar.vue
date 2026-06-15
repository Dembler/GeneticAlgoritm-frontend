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
    <div class="sidebar-brand flex items-start gap-2.5 px-2">
      <div class="sidebar-logo flex size-10 items-center justify-center rounded-lg">
        <Map class="size-5" />
      </div>
      <div class="min-w-0">
        <p class="text-sm font-semibold">{{ t('common.appName') }}</p>
        <p class="text-xs leading-4">{{ t('common.appSubtitle') }}</p>
      </div>
    </div>

    <nav class="mt-6 flex flex-col gap-1 px-1.5">
      <Button
        v-for="item in navigationItems"
        :key="item.id"
        variant="ghost"
        :disabled="item.id === 'analysis' && !analysisAvailable"
        :class="
          cn(
            'sidebar-nav-button h-10 justify-start gap-2.5 rounded-lg px-2.5 text-sm',
            activeSection === item.id && 'sidebar-nav-button--active',
          )
        "
        @click="emit('select', item.id)"
      >
        <component :is="item.icon" class="size-4" />
        {{ t(item.labelKey) }}
      </Button>
    </nav>

    <div class="mt-auto px-3">
      <div class="sidebar-status-card rounded-xl p-3">
        <div class="flex items-center justify-between gap-3">
          <div>
            <p class="text-xs font-medium">{{ t('sidebar.currentRequest') }}</p>
            <p class="mt-1 text-xs leading-5">
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
  isolation: isolate;
  height: 100vh;
  width: 14.5rem;
  flex-direction: column;
  overflow: hidden;
  border-right: 1px solid hsl(0 0% 100% / 0.13);
  background: hsl(0 0% 5%);
  color: hsl(0 0% 98%);
  padding: 1.25rem 0.75rem;
  box-shadow:
    inset -1px 0 0 hsl(0 0% 100% / 0.08),
    18px 0 44px hsl(0 0% 0% / 0.16);
}

.sidebar-brand {
  color: hsl(0 0% 98%);
}

.sidebar-brand p:first-child {
  line-height: 1.25rem;
}

.sidebar-brand p:last-child {
  color: hsl(0 0% 100% / 0.66);
}

.sidebar-logo {
  border: 1px solid hsl(0 0% 100% / 0.2);
  background: hsl(0 0% 100% / 0.1);
  color: hsl(0 0% 100%);
  box-shadow: none;
}

.sidebar-nav-button {
  position: relative;
  border: 1px solid transparent;
  color: hsl(0 0% 100% / 0.78);
  transition:
    color 160ms ease,
    border-color 160ms ease,
    background-color 160ms ease,
    box-shadow 160ms ease,
    transform 160ms ease;
}

.sidebar-nav-button:hover {
  border-color: hsl(0 0% 100% / 0.14);
  background: hsl(0 0% 100% / 0.07);
  color: hsl(0 0% 100% / 0.95);
}

.sidebar-nav-button--active,
.sidebar-nav-button--active:hover {
  border-color: hsl(0 0% 100% / 0.22);
  background: hsl(0 0% 22% / 0.76);
  color: hsl(0 0% 100%);
  box-shadow: inset 0 1px 0 hsl(0 0% 100% / 0.1);
  backdrop-filter: blur(10px);
}

.sidebar-status-card {
  border: 1px solid hsl(0 0% 100% / 0.16);
  background: hsl(0 0% 100% / 0.08);
  color: hsl(0 0% 98%);
  box-shadow: none;
}

.sidebar-status-card p:last-child {
  color: hsl(0 0% 100% / 0.72);
}
</style>
