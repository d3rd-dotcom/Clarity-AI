<template>
  <div
    class="flex items-center gap-1.5"
    :title="statusLabel"
    :aria-label="statusLabel"
  >
    <span
      class="block w-2 h-2 rounded-full"
      :class="{
        'bg-green-500': status === 'ok',
        'bg-amber-400': status === 'degraded',
        'bg-warm-300 animate-pulse': status === 'unknown',
      }"
      aria-hidden="true"
    />
    <span class="text-xs text-ink-mid hidden sm:inline">{{ statusLabel }}</span>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useHealth } from '@/composables/useHealth'

const { status } = useHealth()

const statusLabel = computed(() => {
  if (status.value === 'ok') return 'Service online'
  if (status.value === 'degraded') return 'Service degraded'
  return 'Connecting…'
})
</script>
