<template>
  <article
    class="bg-white border border-warm-200 rounded-xl p-5"
    :aria-label="`${benefit.name} — ${confidenceLabel}`"
  >
    <!-- Header row: name + confidence badge -->
    <div class="flex items-start justify-between gap-3 mb-3">
      <h3 class="text-base font-semibold text-ink leading-snug">
        {{ benefit.name }}
      </h3>
      <ConfidenceBadge :level="benefit.confidence" class="shrink-0 mt-0.5" />
    </div>

    <!-- AI reason — plain English explanation -->
    <p class="text-sm text-ink-mid leading-relaxed mb-4">
      {{ benefit.reason }}
    </p>

    <!-- Amount estimates — only shown when available -->
    <div
      v-if="benefit.weekly_estimate || benefit.monthly_estimate"
      class="bg-warm-50 rounded-lg px-4 py-3 mb-1 flex flex-col sm:flex-row sm:gap-6 gap-1.5"
      aria-label="Estimated payment amounts"
    >
      <div v-if="benefit.monthly_estimate">
        <p class="text-xs text-ink-soft uppercase tracking-wide font-medium mb-0.5">Per month</p>
        <p class="text-lg font-semibold text-ink">
          £{{ formatAmount(benefit.monthly_estimate) }}
        </p>
      </div>
      <div v-if="benefit.weekly_estimate" class="sm:border-l sm:border-warm-200 sm:pl-6">
        <p class="text-xs text-ink-soft uppercase tracking-wide font-medium mb-0.5">Per week</p>
        <p class="text-lg font-semibold text-ink">
          £{{ formatAmount(benefit.weekly_estimate) }}
        </p>
      </div>
    </div>

    <!-- NEEDS_REVIEW specific note -->
    <p
      v-if="benefit.confidence === 'NEEDS_REVIEW'"
      class="text-xs text-conf-review bg-conf-review-bg rounded-lg px-3 py-2 mt-3"
      role="note"
    >
      This result is uncertain. Please verify with an official advisor or GOV.UK before making any financial decisions.
    </p>

    <!-- Step-by-step claim checklist -->
    <ClaimChecklist
      :benefit-name="benefit.name"
      :claim-url="benefit.claim_url"
    />
  </article>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { BenefitResult } from '@/types'
import ConfidenceBadge from './ConfidenceBadge.vue'
import ClaimChecklist from './ClaimChecklist.vue'

const props = defineProps<{ benefit: BenefitResult }>()

const confidenceLabel = computed(() => {
  if (props.benefit.confidence === 'HIGH') return 'Strong match'
  if (props.benefit.confidence === 'MEDIUM') return 'Possible match'
  return 'Complex case, verify required'
})

function formatAmount(amount: number): string {
  const rounded = Math.round(amount * 100) / 100
  return rounded % 1 === 0
    ? rounded.toLocaleString('en-GB')
    : rounded.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
</script>
