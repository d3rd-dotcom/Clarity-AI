import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { FormAnswers, WizardStep } from '@/types'

// ─── Wizard step configuration ───────────────────────────────────────────────
// Plain language designed for vulnerable users on mobile.
// Each step maps exactly to a backend AssessRequest field.
export const WIZARD_STEPS: WizardStep[] = [
  {
    id: 'employment_status',
    question: 'What is your current work situation?',
    hint: 'Choose the option that best describes you right now.',
    options: [
      { value: 'employed', label: 'I work for someone', description: 'Employed part-time or full-time', emoji: '💼' },
      { value: 'unemployed', label: 'Looking for work', description: 'Not currently in employment', emoji: '🔍' },
      { value: 'self_employed', label: 'Self-employed', description: 'Running my own business or freelancing', emoji: '🛠️' },
      { value: 'unable_to_work', label: 'Unable to work', description: 'Due to illness or disability', emoji: '🏥' },
      { value: 'carer', label: "I'm a carer", description: 'Full-time carer for a family member or friend', emoji: '🤝' },
    ],
  },
  {
    id: 'household_situation',
    question: 'Who do you live with?',
    options: [
      { value: 'single', label: 'I live alone', description: 'Single, no children', emoji: '🧍' },
      { value: 'couple', label: 'Me and my partner', description: 'Couple, no children', emoji: '👫' },
      { value: 'single_parent', label: 'Me and my children', description: 'Single parent', emoji: '🧑‍👧' },
      { value: 'couple_with_children', label: 'Family with children', description: 'Couple with children', emoji: '👨‍👩‍👧' },
    ],
  },
  {
    id: 'housing_situation',
    question: 'What is your housing situation?',
    options: [
      { value: 'renting_privately', label: 'I rent privately', description: 'From a private landlord or letting agent', emoji: '🏠' },
      { value: 'mortgage', label: 'I have a mortgage', description: 'Buying my home with a mortgage', emoji: '🔑' },
      { value: 'social_housing', label: 'Social or council housing', description: 'Council or housing association property', emoji: '🏢' },
      { value: 'living_with_family', label: 'Living with family or friends', description: 'Not paying rent separately', emoji: '🏡' },
    ],
  },
  {
    id: 'age_range',
    question: 'How old are you?',
    options: [
      { value: 'under_25', label: 'Under 25', description: '', emoji: '' },
      { value: '25_to_60', label: '25 to 60', description: '', emoji: '' },
      { value: 'over_60', label: 'Over 60', description: 'Or approaching State Pension age', emoji: '' },
    ],
  },
  {
    id: 'health_disability',
    question: 'Do you have a health condition or disability?',
    hint: 'This includes long-term physical or mental health conditions.',
    options: [
      { value: 'none', label: 'No', description: 'No long-term conditions', emoji: '' },
      { value: 'affects_work', label: 'Yes — affects my ability to work', description: '', emoji: '' },
      { value: 'affects_daily_life', label: 'Yes — affects my daily life', description: '', emoji: '' },
      { value: 'carer_for_someone', label: 'I care for someone with a condition', description: '', emoji: '' },
    ],
  },
  {
    id: 'num_children',
    question: 'How many dependent children do you have?',
    hint: 'Children under 16, or under 20 if still in education.',
    conditional: true, // only shown if household_situation includes children
    options: [
      { value: '1', label: '1 child', description: '', emoji: '' },
      { value: '2', label: '2 children', description: '', emoji: '' },
      { value: '3', label: '3 children', description: '', emoji: '' },
      { value: '4', label: '4 or more', description: '', emoji: '' },
    ],
  },
]

// ─── Store ────────────────────────────────────────────────────────────────────
export const useFormStore = defineStore('form', () => {
  // State
  const currentStepIndex = ref(0)
  const answers = ref<FormAnswers>({
    employment_status: null,
    household_situation: null,
    housing_situation: null,
    age_range: null,
    health_disability: null,
    num_children: 0,
  })

  // Which steps are actually visible — the children step is conditional
  const visibleSteps = computed(() => {
    const hasChildren =
      answers.value.household_situation === 'single_parent' ||
      answers.value.household_situation === 'couple_with_children'

    return WIZARD_STEPS.filter(step => {
      if (step.id === 'num_children') return hasChildren
      return true
    })
  })

  const totalSteps = computed(() => visibleSteps.value.length)

  const currentStep = computed(() => visibleSteps.value[currentStepIndex.value] ?? null)

  // Current answer for the active step
  const currentAnswer = computed(() => {
    const step = currentStep.value
    if (!step) return null
    const val = answers.value[step.id]
    // num_children is a number — convert to string for option matching
    if (step.id === 'num_children') return val === 0 ? null : String(val)
    return val as string | null
  })

  const canGoNext = computed(() => currentAnswer.value !== null)

  const canGoBack = computed(() => currentStepIndex.value > 0)

  const isLastStep = computed(() => currentStepIndex.value === totalSteps.value - 1)

  const isComplete = computed(() => {
    const base = [
      answers.value.employment_status,
      answers.value.household_situation,
      answers.value.housing_situation,
      answers.value.age_range,
      answers.value.health_disability,
    ].every(v => v !== null)

    const hasChildren =
      answers.value.household_situation === 'single_parent' ||
      answers.value.household_situation === 'couple_with_children'

    if (hasChildren) return base && answers.value.num_children > 0
    return base
  })

  // Progress percentage for the progress bar
  const progressPercent = computed(() => {
    if (totalSteps.value === 0) return 0
    return Math.round(((currentStepIndex.value + 1) / totalSteps.value) * 100)
  })

  // Actions
  function setAnswer(stepId: keyof FormAnswers, value: string) {
    if (stepId === 'num_children') {
      answers.value.num_children = parseInt(value, 10)
    } else {
      // TypeScript needs the cast since value is always the right enum string
      ;(answers.value as Record<keyof FormAnswers, string | number | null>)[stepId] = value
    }

    // If household changes away from having children, reset num_children
    if (stepId === 'household_situation') {
      const hasChildren = value === 'single_parent' || value === 'couple_with_children'
      if (!hasChildren) answers.value.num_children = 0
    }
  }

  function nextStep() {
    if (currentStepIndex.value < totalSteps.value - 1) {
      currentStepIndex.value++
    }
  }

  function prevStep() {
    if (currentStepIndex.value > 0) {
      currentStepIndex.value--
    }
  }

  function reset() {
    currentStepIndex.value = 0
    answers.value = {
      employment_status: null,
      household_situation: null,
      housing_situation: null,
      age_range: null,
      health_disability: null,
      num_children: 0,
    }
  }

  return {
    currentStepIndex,
    answers,
    visibleSteps,
    totalSteps,
    currentStep,
    currentAnswer,
    canGoNext,
    canGoBack,
    isLastStep,
    isComplete,
    progressPercent,
    setAnswer,
    nextStep,
    prevStep,
    reset,
  }
})
