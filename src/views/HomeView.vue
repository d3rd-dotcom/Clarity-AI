<template>
  <main
    id="main"
    class="flex flex-col items-center justify-between min-h-dvh px-6 py-8"
  >
    <!-- Top spacer for vertical centering -->
    <div class="flex-1" aria-hidden="true" />

    <!-- Hero section -->
    <div class="flex flex-col items-center text-center w-full max-w-sm">
      <!-- Logo mark on gold circle — the brand anchor -->
      <div
        class="w-24 h-24 rounded-full bg-brand-gold flex items-center justify-center mb-8 shadow-lg"
        aria-hidden="true"
      >
        <LogoMark :size="52" color="white" />
      </div>

      <!-- Brand name -->
      <p class="text-xs font-semibold tracking-widest uppercase text-brand-gold-dark mb-4">
        Clarity
      </p>

      <!-- The product thesis — plain, honest, specific -->
      <h1 class="text-3xl font-bold text-ink leading-tight mb-4">
        Find out which UK benefits you're entitled to
      </h1>

      <p class="text-base text-ink-mid leading-relaxed mb-2">
        Answer 6 quick questions.
        <br />
        We find the money you may be missing.
      </p>

      <p class="text-sm text-ink-soft mb-8">
        Free. No account. Takes 2 minutes.
      </p>

      <!-- Primary CTA -->
      <RouterLink
        to="/check"
        class="w-full py-4 px-6 bg-brand-gold text-ink text-base font-bold rounded-xl
               hover:bg-brand-gold-dark hover:text-white transition-colors text-center block
               focus-visible:outline-3 focus-visible:outline-brand-gold focus-visible:outline-offset-2 focus-visible:rounded-xl"
        @click="formStore.reset()"
      >
        Check my eligibility →
      </RouterLink>

      <!-- Privacy reassurance under the CTA -->
      <p class="text-xs text-ink-soft mt-3 flex items-center gap-1.5 justify-center">
        <span aria-hidden="true">🔒</span>
        We don't save your answers
      </p>
    </div>

    <!-- Bottom section -->
    <div class="flex-1 flex flex-col justify-end w-full max-w-sm">
      <!-- Social proof / problem statement -->
      <div class="mt-12 pt-6 border-t border-warm-200 text-center">
        <p class="text-sm text-ink-mid leading-relaxed">
          <span class="font-semibold text-ink">£24 billion</span> in UK benefits goes unclaimed every year —
          not because people don't need it, but because the system is hard to navigate.
        </p>
      </div>
    </div>
  </main>
</template>

<script setup lang="ts">
import { RouterLink } from 'vue-router'
import LogoMark from '@/components/ui/LogoMark.vue'
import { useFormStore } from '@/stores/formStore'

const formStore = useFormStore()
</script>
