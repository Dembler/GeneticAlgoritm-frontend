<script setup lang="ts">
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { BarChart3, Clock3, Menu, Route, Settings } from 'lucide-vue-next'

import { Button, Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/shared/ui'
import { cn } from '@/shared/lib/utils'

import AnalysisWorkspace from './components/AnalysisWorkspace.vue'
import HistoryWorkspace from './components/HistoryWorkspace.vue'
import RouteWorkspace from './components/RouteWorkspace.vue'
import ServiceSidebar, { type ServiceSection } from './components/ServiceSidebar.vue'
import SettingsWorkspace from './components/SettingsWorkspace.vue'
import { useRouteLab } from './model/useRouteLab'

const { t } = useI18n({ useScope: 'global' })
const routeLab = useRouteLab()
const activeSection = ref<ServiceSection>('route')
const mobileMenuOpen = ref(false)

const mobileNavigation = [
  { id: 'route', labelKey: 'navigation.route', icon: Route },
  { id: 'analysis', labelKey: 'navigation.analysis', icon: BarChart3 },
  { id: 'history', labelKey: 'navigation.history', icon: Clock3 },
  { id: 'settings', labelKey: 'navigation.settings', icon: Settings },
] satisfies Array<{
  id: ServiceSection
  labelKey: string
  icon: typeof Route
}>

function selectSection(section: ServiceSection) {
  if (section === 'analysis' && !routeLab.result.value) {
    return false
  }

  activeSection.value = section
  return true
}

function selectMobileSection(section: ServiceSection) {
  if (selectSection(section)) {
    mobileMenuOpen.value = false
  }
}

async function openRunFromHistory(runId: string) {
  await routeLab.openRun(runId)

  if (routeLab.result.value) {
    activeSection.value = 'route'
  }
}

watch(
  () => routeLab.result.value,
  (result) => {
    if (!result && activeSection.value === 'analysis') {
      activeSection.value = 'route'
    }
  },
)
</script>

<template>
  <div class="service-shell">
    <ServiceSidebar
      class="hidden lg:flex"
      :active-section="activeSection"
      :analysis-available="Boolean(routeLab.result.value)"
      @select="selectSection"
    />

    <main class="min-w-0 flex-1">
      <div class="sticky top-0 z-20 border-b bg-background/92 px-4 py-3 backdrop-blur lg:hidden">
        <div class="flex items-center gap-3">
          <div
            class="flex size-9 items-center justify-center rounded-lg bg-primary text-sm font-semibold text-primary-foreground"
          >
            RO
          </div>
          <div class="min-w-0">
            <p class="truncate text-sm font-semibold text-foreground">{{ t('common.appName') }}</p>
            <p class="truncate text-xs text-muted-foreground">{{ t('common.noAuth') }}</p>
          </div>

          <Sheet v-model:open="mobileMenuOpen">
            <Button
              variant="outline"
              size="icon"
              class="ml-auto rounded-xl"
              aria-label="Открыть меню"
              @click="mobileMenuOpen = true"
            >
              <Menu class="size-4" />
            </Button>

            <SheetContent class="w-[18rem] max-w-[88vw]">
              <SheetHeader>
                <SheetTitle>{{ t('common.appName') }}</SheetTitle>
                <SheetDescription>{{ t('common.noAuth') }}</SheetDescription>
              </SheetHeader>

              <nav class="grid gap-2 px-4">
                <Button
                  v-for="item in mobileNavigation"
                  :key="item.id"
                  variant="ghost"
                  :disabled="item.id === 'analysis' && !routeLab.result.value"
                  :class="
                    cn(
                      'h-10 justify-start gap-3 rounded-lg px-3 text-sm text-muted-foreground',
                      activeSection === item.id &&
                        'bg-primary/10 text-primary hover:bg-primary/10 hover:text-primary',
                    )
                  "
                  @click="selectMobileSection(item.id)"
                >
                  <component :is="item.icon" class="size-4" />
                  {{ t(item.labelKey) }}
                </Button>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      <div class="service-content">
        <RouteWorkspace
          v-if="activeSection === 'route'"
          v-model:draft="routeLab.draft.value"
          v-model:json-value="routeLab.jsonState.value.value"
          v-model:json-error="routeLab.jsonState.value.error"
          v-model:selected-alternative-rank="routeLab.selectedAlternativeRank.value"
          :result="routeLab.result.value"
          :running="routeLab.running.value"
          :can-run="routeLab.canRun.value"
          :error="routeLab.error.value"
          @run="routeLab.runRoute"
          @sync-json="routeLab.syncJsonFromDraft"
          @apply-json="routeLab.applyJsonDraft"
          @reset-draft="routeLab.resetDraft"
          @open-analysis="selectSection('analysis')"
          @apply-scenario="routeLab.applyScenario"
          @run-scenario="routeLab.runScenario"
        />

        <AnalysisWorkspace
          v-else-if="activeSection === 'analysis'"
          v-model:selected-alternative-rank="routeLab.selectedAlternativeRank.value"
          :result="routeLab.result.value"
        />

        <HistoryWorkspace
          v-else-if="activeSection === 'history'"
          :runs="routeLab.runs.value"
          :loading="routeLab.loadingRuns.value"
          :error="routeLab.runsError.value"
          @refresh="routeLab.refreshRuns"
          @open-run="openRunFromHistory"
        />

        <SettingsWorkspace v-else />
      </div>
    </main>
  </div>
</template>

<style scoped>
.service-shell {
  min-height: 100vh;
  display: flex;
  background:
    radial-gradient(
      circle at top left,
      color-mix(in oklch, var(--chart-3) 10%, transparent),
      transparent 30rem
    ),
    color-mix(in oklch, var(--background) 96%, var(--card) 4%);
}

.service-content {
  min-width: 0;
  width: min(100%, 76rem);
  margin: 0 auto;
  padding: 1.5rem;
}

@media (max-width: 1023px) {
  .service-shell {
    display: block;
  }

  .service-content {
    padding: 1rem;
  }
}
</style>
