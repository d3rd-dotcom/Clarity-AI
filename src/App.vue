<template>
  <!-- bg-warm-50 applies the warm off-white to the whole app -->
  <div class="bg-warm-50 min-h-dvh">
    <RouterView />
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { RouterView } from 'vue-router'
import { useHealth } from '@/composables/useHealth'

const { checkHealth } = useHealth()

// Run health check once when app loads — result is cached in the singleton
onMounted(() => {
  checkHealth()
})
</script>
