<template>
  <!--
    Each option is a radio button styled as a full-width card.
    Left-border accent is the signature design element:
    - Unselected: warm-200 left border, white background
    - Selected:   brand-gold left border, warm-100 background
    Minimum 56px height — exceeds 44px WCAG touch target requirement.
  -->
  <label
    class="flex items-center gap-4 w-full px-4 py-4 rounded-xl cursor-pointer
           border border-warm-200 transition-all duration-150
           border-l-4
           hover:border-warm-300 hover:bg-warm-50
           has-[:checked]:border-l-brand-gold has-[:checked]:bg-warm-100 has-[:checked]:border-warm-200
           focus-within:outline-2 focus-within:outline-brand-gold focus-within:outline-offset-2"
    :class="{ 'border-l-brand-gold bg-warm-100': isSelected }"
  >
    <!-- Visually hidden actual radio input — keyboard + screen reader accessible -->
    <input
      type="radio"
      :name="groupName"
      :value="value"
      :checked="isSelected"
      class="sr-only"
      @change="emit('select', value)"
    />

    <!-- Emoji indicator (decorative, hidden from screen readers) -->
    <span
      v-if="emoji"
      class="text-xl shrink-0 w-7 text-center"
      aria-hidden="true"
    >{{ emoji }}</span>

    <!-- Custom radio circle -->
    <span
      class="shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors"
      :class="isSelected ? 'border-brand-gold bg-brand-gold' : 'border-warm-300 bg-white'"
      aria-hidden="true"
    >
      <span
        v-if="isSelected"
        class="w-2 h-2 rounded-full bg-white"
      />
    </span>

    <!-- Text -->
    <span class="flex flex-col gap-0.5 min-w-0">
      <span
        class="text-sm font-semibold leading-snug"
        :class="isSelected ? 'text-ink' : 'text-ink'"
      >{{ label }}</span>
      <span
        v-if="description"
        class="text-xs text-ink-mid leading-snug"
      >{{ description }}</span>
    </span>
  </label>
</template>

<script setup lang="ts">
defineProps<{
  value: string
  label: string
  description?: string
  emoji?: string
  groupName: string
  isSelected: boolean
}>()

const emit = defineEmits<{ select: [value: string] }>()
</script>
