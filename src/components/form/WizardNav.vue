<template>
  <div class="flex gap-3 pt-2">
    <!-- Back button — ghost style, only visible when not on step 1 -->
    <button
      v-if="canGoBack"
      class="flex-1 py-3.5 px-4 rounded-xl border border-warm-200 text-ink-mid text-sm font-medium
             hover:border-warm-300 hover:text-ink transition-colors
             focus-visible:outline-2 focus-visible:outline-brand-gold"
      @click="emit('back')"
    >
      ← Back
    </button>

    <!-- Next or Submit button -->
    <button
      class="py-3.5 px-4 rounded-xl text-sm font-semibold transition-colors
             focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-gold"
      :class="[
        canGoNext
          ? 'bg-brand-gold text-ink hover:bg-brand-gold-dark hover:text-white'
          : 'bg-warm-200 text-warm-300 cursor-not-allowed',
        canGoBack ? 'flex-1' : 'w-full',
      ]"
      :disabled="!canGoNext"
      :aria-disabled="!canGoNext"
      @click="canGoNext && emit(isLastStep ? 'submit' : 'next')"
    >
      {{ isLastStep ? 'Check my benefits' : 'Next →' }}
    </button>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  canGoBack: boolean
  canGoNext: boolean
  isLastStep: boolean
}>()

const emit = defineEmits<{
  next: []
  back: []
  submit: []
}>()
</script>
