<template>
  <main id="main" class="flex flex-col min-h-dvh px-6 py-4 max-w-sm mx-auto w-full">

    <!-- Top bar: back-to-home + progress -->
    <div class="flex items-center justify-between mb-2">
      <RouterLink
        to="/"
        class="text-xs text-ink-soft hover:text-ink transition-colors
               focus-visible:outline-2 focus-visible:outline-brand-gold focus-visible:rounded px-1"
        aria-label="Back to home"
      >
        ← Home
      </RouterLink>
      <HealthIndicator />
    </div>

    <!-- Step progress dots -->
    <ProgressDots
      :current="formStore.currentStepIndex + 1"
      :total="formStore.totalSteps"
    />

    <!-- Question area — grows to fill available space -->
    <div class="flex-1 flex flex-col justify-center py-6">

      <!-- Question heading — receives focus on step change for screen readers -->
      <h1
        ref="questionHeadingRef"
        tabindex="-1"
        class="text-2xl font-bold text-ink mb-2 leading-snug outline-none"
      >
        {{ formStore.currentStep?.question }}
      </h1>

      <p
        v-if="formStore.currentStep?.hint"
        class="text-sm text-ink-mid mb-6"
      >
        {{ formStore.currentStep.hint }}
      </p>
      <div v-else class="mb-6" />

      <!-- Option cards — role="radiogroup" wraps all radio inputs semantically -->
      <div
        role="radiogroup"
        :aria-labelledby="`question-heading-${formStore.currentStepIndex}`"
        class="flex flex-col gap-3"
      >
        <OptionCard
          v-for="option in formStore.currentStep?.options"
          :key="option.value"
          :value="option.value"
          :label="option.label"
          :description="option.description"
          :emoji="option.emoji"
          :group-name="`step-${formStore.currentStepIndex}`"
          :is-selected="formStore.currentAnswer === option.value"
          @select="handleSelect"
        />
      </div>
    </div>

    <!-- Navigation pinned to bottom -->
    <div class="pb-safe pt-2">
      <WizardNav
        :can-go-back="formStore.canGoBack"
        :can-go-next="formStore.canGoNext"
        :is-last-step="formStore.isLastStep"
        @back="handleBack"
        @next="handleNext"
        @submit="handleSubmit"
      />
    </div>
  </main>
</template>

<script setup lang="ts">
import { ref, watch, nextTick } from 'vue'
import { RouterLink } from 'vue-router'
import { useFormStore } from '@/stores/formStore'
import { useAssess } from '@/composables/useAssess'
import ProgressDots from '@/components/form/ProgressDots.vue'
import OptionCard from '@/components/form/OptionCard.vue'
import WizardNav from '@/components/form/WizardNav.vue'
import HealthIndicator from '@/components/ui/HealthIndicator.vue'

const formStore = useFormStore()
const { submitAssessment } = useAssess()

const questionHeadingRef = ref<HTMLElement | null>(null)

// ── Focus management ──────────────────────────────────────────────────────────
// On every step change, move focus to the question heading.
// This is critical for screen reader users — without this, they
// have to manually navigate to find the new question.
watch(
  () => formStore.currentStepIndex,
  async () => {
    await nextTick() // wait for DOM update
    questionHeadingRef.value?.focus()
  },
)

function handleSelect(value: string) {
  const stepId = formStore.currentStep?.id
  if (!stepId) return
  formStore.setAnswer(stepId, value)
}

function handleNext() {
  formStore.nextStep()
}

function handleBack() {
  formStore.prevStep()
}

async function handleSubmit() {
  await submitAssessment()
}
</script>
