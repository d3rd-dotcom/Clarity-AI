<template>
  <!-- Clarity cupped-hands logo mark -->
  <!-- size prop controls both width and height -->
  <svg
    :width="size"
    :height="size"
    viewBox="0 0 100 90"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    :aria-label="ariaLabel"
    :role="ariaLabel ? 'img' : 'presentation'"
    :aria-hidden="!ariaLabel"
  >
    <!-- Left hand — curves from lower-left up toward center -->
    <path
      :fill="color"
      d="M6,80
         C6,80 1,55 13,35
         C22,18 38,12 46,28
         C49,35 48,47 43,56
         C37,67 22,75 6,80 Z"
    />
    <!-- Left thumb fold — creates the inner curve -->
    <path
      :fill="color"
      d="M43,56
         C45,46 52,40 52,54
         C52,62 47,68 43,72 Z"
      opacity="0.88"
    />
    <!-- Right hand — mirror -->
    <path
      :fill="color"
      d="M94,80
         C94,80 99,55 87,35
         C78,18 62,12 54,28
         C51,35 52,47 57,56
         C63,67 78,75 94,80 Z"
    />
    <!-- Right thumb fold -->
    <path
      :fill="color"
      d="M57,56
         C55,46 48,40 48,54
         C48,62 53,68 57,72 Z"
      opacity="0.88"
    />
  </svg>
</template>

<script setup lang="ts">
withDefaults(defineProps<{
  size?: number
  color?: string
  ariaLabel?: string
}>(), {
  size: 48,
  color: 'white',
  ariaLabel: undefined,
})
</script>
