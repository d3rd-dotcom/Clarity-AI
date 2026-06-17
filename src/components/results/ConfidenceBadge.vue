<template>
  <!-- WCAG requirement: confidence is communicated via BOTH colour and text.
       Never rely on colour alone. -->
  <span
    class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
    :class="badgeClasses"
    :aria-label="`Confidence: ${levelLabel}`"
  >
    <!-- Dot indicator (colour) -->
    <span
      class="w-1.5 h-1.5 rounded-full shrink-0"
      :class="dotClass"
      aria-hidden="true"
    />
    <!-- Text label (meaning) -->
    {{ levelLabel }}
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { ConfidenceLevel } from '@/types'

const props = defineProps<{ level: ConfidenceLevel }>()

const badgeClasses = computed(() => ({
  'bg-conf-high-bg text-conf-high':       props.level === 'HIGH',
  'bg-conf-med-bg text-conf-med':         props.level === 'MEDIUM',
  'bg-conf-review-bg text-conf-review':   props.level === 'NEEDS_REVIEW',
}))

const dotClass = computed(() => ({
  'bg-conf-high':   props.level === 'HIGH',
  'bg-conf-med':    props.level === 'MEDIUM',
  'bg-conf-review': props.level === 'NEEDS_REVIEW',
}))

const levelLabel = computed(() => {
  if (props.level === 'HIGH') return 'Strong match'
  if (props.level === 'MEDIUM') return 'Possible match'
  return 'Complex case — verify'
})
</script>
