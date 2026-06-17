<template>
  <!--
    The signature element of the whole product.
    A warm gold card revealing the total unclaimed amount.
    Entrance: scale + opacity, respects prefers-reduced-motion.
    Georgia font used ONLY here — display typeface for the amount.
  -->
  <div
    class="rounded-2xl bg-brand-gold px-6 py-7 money-card-enter"
    role="region"
    aria-label="Your total estimated unclaimed benefits"
  >
    <!-- Logo mark as decorative accent -->
    <div class="flex justify-center mb-4" aria-hidden="true">
      <LogoMark :size="38" color="white" />
    </div>

    <!-- Framing text -->
    <p class="text-center text-sm font-medium text-ink mb-1 opacity-80">
      You may be leaving unclaimed
    </p>

    <!-- The number — Georgia, large, the whole point of the product -->
    <p
      class="font-display text-center font-bold leading-none mb-1"
      style="font-size: clamp(2.5rem, 8vw, 3.5rem); color: #1C1A17;"
      aria-live="polite"
    >
      £{{ formatAmount(monthlyTotal) }}
      <span class="text-base font-sans font-medium opacity-70">/month</span>
    </p>

    <!-- Weekly equivalent -->
    <p class="text-center text-sm text-ink opacity-70 mb-4">
      (around £{{ formatAmount(weeklyTotal) }} per week)
    </p>

    <!-- Benefit count -->
    <p class="text-center text-xs text-ink opacity-60">
      Across {{ benefitCount }} {{ benefitCount === 1 ? 'benefit' : 'benefits' }} found for your situation
    </p>
  </div>
</template>

<script setup lang="ts">
import LogoMark from '@/components/ui/LogoMark.vue'

defineProps<{
  monthlyTotal: number
  weeklyTotal: number
  benefitCount: number
}>()

function formatAmount(amount: number): string {
  // Format to 2 decimal places, remove unnecessary .00
  const rounded = Math.round(amount * 100) / 100
  return rounded % 1 === 0 ? rounded.toLocaleString('en-GB') : rounded.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
</script>

<style scoped>
.money-card-enter {
  animation: card-reveal 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) both;
}

@keyframes card-reveal {
  from {
    opacity: 0;
    transform: scale(0.95) translateY(8px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

/* prefers-reduced-motion: skip animation entirely */
@media (prefers-reduced-motion: reduce) {
  .money-card-enter {
    animation: none;
  }
}
</style>
