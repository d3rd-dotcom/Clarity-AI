<template>
  <!-- Results page handles three states: loading, error, and actual results -->

  <!-- STATE 1: Loading -->
  <LoadingScreen v-if="resultsStore.isLoading" />

  <!-- STATE 2: Error -->
  <main
    v-else-if="resultsStore.error"
    id="main"
    class="min-h-dvh px-6 py-8 max-w-sm mx-auto w-full"
  >
    <RouterLink
      to="/"
      class="inline-block text-xs text-ink-soft hover:text-ink mb-8
             focus-visible:outline-2 focus-visible:outline-brand-gold focus-visible:rounded"
    >
      ← Start again
    </RouterLink>

    <ErrorScreen
      :message="resultsStore.error"
      @retry="handleRetry"
    />
  </main>

  <!-- STATE 3: Results -->
  <main
    v-else-if="resultsStore.data"
    id="main"
    class="px-6 py-6 max-w-sm mx-auto w-full"
  >
    <!-- Header -->
    <div class="flex items-center justify-between mb-6">
      <div class="flex items-center gap-2">
        <div
          class="w-8 h-8 rounded-full bg-brand-gold flex items-center justify-center shrink-0"
          aria-hidden="true"
        >
          <LogoMark :size="18" color="white" />
        </div>
        <span class="text-sm font-semibold text-ink">Clarity</span>
      </div>

      <button
        class="text-xs text-ink-soft hover:text-ink transition-colors
               focus-visible:outline-2 focus-visible:outline-brand-gold focus-visible:rounded px-1"
        @click="handleStartAgain"
      >
        Start again
      </button>
    </div>

    <!-- Fallback banner — shown if AI pipeline fell back to static data -->
    <FallbackBanner
      v-if="resultsStore.data.data_source === 'fallback'"
      class="mb-5"
    />

    <!-- THE WOW MOMENT — total money card -->
    <MoneyCard
      :monthly-total="resultsStore.data.total_monthly_estimate"
      :weekly-total="resultsStore.data.total_weekly_estimate"
      :benefit-count="resultsStore.data.benefits.length"
      class="mb-6"
    />

    <!-- Results heading -->
    <h2 class="text-lg font-bold text-ink mb-4">
      Benefits found for you
    </h2>

    <!-- Individual benefit cards -->
    <div class="flex flex-col gap-4 mb-6" role="list" aria-label="Benefit results">
      <div
        v-for="benefit in resultsStore.data.benefits"
        :key="benefit.name"
        role="listitem"
      >
        <BenefitCard :benefit="benefit" />
      </div>
    </div>

    <!-- Empty state — shouldn't happen, but handle gracefully -->
    <div
      v-if="resultsStore.data.benefits.length === 0"
      class="text-center py-8 text-ink-mid"
    >
      <p class="text-sm">
        No clear benefit matches found for your situation. This may be a complex case —
        please speak to a
        <a
          href="https://www.citizensadvice.org.uk/"
          target="_blank"
          rel="noopener noreferrer"
          class="underline text-brand-gold-dark"
        >Citizens Advice advisor</a>.
      </p>
    </div>

    <!-- Legal disclaimer — always shown -->
    <Disclaimer class="mb-8" />

    <!-- Situation summary — shown for transparency -->
    <details class="mb-6">
      <summary
        class="text-xs text-ink-soft cursor-pointer hover:text-ink-mid
                focus-visible:outline-2 focus-visible:outline-brand-gold focus-visible:rounded"
      >
        View what we checked
      </summary>
      <p class="text-xs text-ink-soft mt-2 pl-3 border-l-2 border-warm-200 leading-relaxed">
        {{ resultsStore.data.situation }}
      </p>
    </details>
  </main>

  <!-- STATE 4: No data and not loading — redirect guard (shouldn't reach here) -->
  <div v-else class="flex items-center justify-center min-h-dvh">
    <p class="text-ink-mid text-sm">Redirecting…</p>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { useResultsStore } from '@/stores/resultsStore'
import { useFormStore } from '@/stores/formStore'
import LoadingScreen from '@/components/ui/LoadingScreen.vue'
import ErrorScreen from '@/components/ui/ErrorScreen.vue'
import LogoMark from '@/components/ui/LogoMark.vue'
import MoneyCard from '@/components/results/MoneyCard.vue'
import BenefitCard from '@/components/results/BenefitCard.vue'
import FallbackBanner from '@/components/results/FallbackBanner.vue'
import Disclaimer from '@/components/results/Disclaimer.vue'

const resultsStore = useResultsStore()
const formStore = useFormStore()
const router = useRouter()

// Navigation guard — if user lands here directly with no data and not loading,
// send them back to home
onMounted(() => {
  if (!resultsStore.isLoading && !resultsStore.data && !resultsStore.error) {
    router.replace('/')
  }
})

function handleRetry() {
  resultsStore.reset()
  router.push('/check')
}

function handleStartAgain() {
  resultsStore.reset()
  formStore.reset()
  router.push('/')
}
</script>
