<template>
  <!-- Step indicator: "Step 2 of 6" + visual dots
       Screen readers get the text; sighted users get dots. -->
  <div class="flex flex-col items-center gap-3 pt-4 pb-2">
    <!-- Text for screen readers and as visual label -->
    <p class="text-xs font-medium text-ink-mid" aria-live="polite" aria-atomic="true">
      Step {{ current }} of {{ total }}
    </p>

    <!-- Visual dots — aria-hidden since the text above covers it -->
    <div class="flex gap-2" aria-hidden="true">
      <span
        v-for="i in total"
        :key="i"
        class="rounded-full transition-all duration-300"
        :class="
          i === current
            ? 'w-5 h-2.5 bg-brand-gold'       /* active: pill shape, gold */
            : i < current
              ? 'w-2.5 h-2.5 bg-brand-gold-dark opacity-50'  /* done: smaller, dimmed */
              : 'w-2.5 h-2.5 bg-warm-200'                    /* upcoming: grey */
        "
      />
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  current: number  // 1-based
  total: number
}>()
</script>
