<template>
  <div class="mt-4">
    <!-- Toggle button -->
    <button
      class="flex items-center gap-2 text-sm font-medium text-brand-gold-dark
             hover:text-brand-gold-deep transition-colors
             focus-visible:outline-2 focus-visible:outline-brand-gold focus-visible:rounded"
      :aria-expanded="isExpanded"
      :aria-controls="`checklist-${uid}`"
      @click="isExpanded = !isExpanded"
    >
      <span
        class="transition-transform duration-200 text-xs"
        :class="{ 'rotate-90': isExpanded }"
        aria-hidden="true"
      >▶</span>
      {{ isExpanded ? 'Hide' : 'How to claim' }} step-by-step
    </button>

    <!-- Expandable checklist -->
    <div
      v-show="isExpanded"
      :id="`checklist-${uid}`"
      class="mt-3"
    >
      <ol class="space-y-2.5" role="list">
        <li
          v-for="(step, idx) in checklist"
          :key="step.id"
          class="flex gap-3 items-start"
        >
          <!-- Step number -->
          <span
            class="shrink-0 w-6 h-6 rounded-full bg-warm-200 text-ink-mid
                   text-xs font-semibold flex items-center justify-center mt-0.5"
            aria-hidden="true"
          >
            {{ idx + 1 }}
          </span>
          <!-- Step text -->
          <span class="text-sm text-ink-mid leading-relaxed">{{ step.text }}</span>
        </li>
      </ol>

      <!-- GOV.UK verify button -->
      <a
        :href="claimUrl"
        target="_blank"
        rel="noopener noreferrer"
        class="mt-4 flex items-center justify-center gap-2 w-full py-3 px-4 rounded-xl
               border-2 border-brand-gold text-brand-gold-dark text-sm font-semibold
               hover:bg-brand-gold hover:text-ink transition-colors
               focus-visible:outline-2 focus-visible:outline-brand-gold"
      >
        Verify on GOV.UK
        <span aria-hidden="true">↗</span>
        <span class="sr-only">(opens in new tab)</span>
      </a>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { getChecklist } from '@/data/claimChecklists'

const props = defineProps<{
  benefitName: string
  claimUrl: string
}>()

const isExpanded = ref(false)
// Unique ID for aria-controls — prevents collisions when multiple checklists render
const uid = Math.random().toString(36).slice(2, 8)
const checklist = computed(() => getChecklist(props.benefitName))
</script>
