<template>
  <!-- Full-screen loading state during API call.
       aria-live="polite" announces state changes to screen readers. -->
  <div
    class="fixed inset-0 flex flex-col items-center justify-center bg-warm-50 z-50"
    role="status"
    aria-live="polite"
    aria-label="Checking your eligibility, please wait"
  >
    <!-- Animated logo mark -->
    <div
      class="mb-8 rounded-full bg-brand-gold p-6 logo-breathe"
      aria-hidden="true"
    >
      <LogoMark :size="52" color="white" />
    </div>

    <!-- Status messages cycle to show progress -->
    <h1 class="text-xl font-semibold text-ink text-center mb-2 px-6">
      Checking your eligibility
    </h1>
    <p
      class="text-ink-mid text-center px-6 text-sm transition-opacity duration-500"
      aria-live="polite"
      aria-atomic="true"
    >
      {{ currentMessage }}
    </p>
    <p class="text-ink-soft text-xs text-center px-6 mt-1">
      This usually takes 5–10 seconds
    </p>

    <!-- Progress dots -->
    <div class="flex gap-1.5 mt-8" aria-hidden="true">
      <span
        v-for="i in 3"
        :key="i"
        class="w-2 h-2 rounded-full bg-brand-gold dot-bounce"
        :style="{ animationDelay: `${(i - 1) * 0.2}s` }"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import LogoMark from './LogoMark.vue'

const messages = [
  'Looking at Universal Credit rules…',
  'Checking Child Benefit eligibility…',
  'Reviewing housing benefit options…',
  'Checking disability payments…',
  'Calculating your total…',
]

const currentMessage = ref(messages[0]!)
let interval: ReturnType<typeof setInterval>

onMounted(() => {
  let i = 1
  interval = setInterval(() => {
    currentMessage.value = messages[i % messages.length]!
    i++
  }, 2000)
})

onUnmounted(() => clearInterval(interval))
</script>

<style scoped>
/* Breathing animation for the logo — single deliberate motion, respects prefers-reduced-motion */
.logo-breathe {
  animation: breathe 3s ease-in-out infinite;
}

@keyframes breathe {
  0%, 100% { transform: scale(1); }
  50%       { transform: scale(1.06); }
}

.dot-bounce {
  animation: bounce 1.2s ease-in-out infinite;
}

@keyframes bounce {
  0%, 80%, 100% { transform: translateY(0); opacity: 0.6; }
  40%           { transform: translateY(-6px); opacity: 1; }
}
</style>
