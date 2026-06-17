<template>
  <div
    class="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center"
    role="alert"
  >
    <div class="text-4xl mb-4" aria-hidden="true">⚠️</div>

    <h2 class="text-xl font-semibold text-ink mb-2">
      Something went wrong
    </h2>

    <p class="text-ink-mid text-sm mb-6 max-w-sm">
      {{ message }}
    </p>

    <button
      class="px-6 py-3 bg-brand-gold text-ink font-semibold rounded-xl text-sm
             hover:bg-brand-gold-dark hover:text-white transition-colors
             focus-visible:outline-3 focus-visible:outline-brand-gold focus-visible:outline-offset-2"
      @click="emit('retry')"
    >
      Try again
    </button>

    <p class="text-xs text-ink-soft mt-6">
      Or contact
      <a
        href="https://www.citizensadvice.org.uk/"
        target="_blank"
        rel="noopener noreferrer"
        class="underline text-brand-gold-dark hover:text-brand-gold-deep"
      >
        Citizens Advice
      </a>
      for free guidance.
    </p>
  </div>
</template>

<script setup lang="ts">
defineProps<{ message: string }>()
const emit = defineEmits<{ retry: [] }>()
</script>
