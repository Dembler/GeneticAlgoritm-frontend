<script setup lang="ts">
import { Toaster } from '@/shared/ui'
</script>

<template>
  <div class="app-shell">
    <Toaster />
    <RouterView />
  </div>
</template>
