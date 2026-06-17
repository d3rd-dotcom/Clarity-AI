<template>
  <!--
    Shown when the live RAG pipeline didn't respond and we're serving
    pre-verified static results. Warm amber tone — informational, not alarming.
  -->
  <div
    class="flex gap-3 bg-conf-med-bg border border-amber-200 rounded-xl px-4 py-3.5"
    role="note"
    aria-label="Note about result accuracy"
  >
    <span class="text-lg shrink-0" aria-hidden="true">ℹ️</span>
    <div>
      <p class="text-sm font-semibold text-conf-med mb-0.5">
        Pre-verified results
      </p>
      <p class="text-xs text-amber-800 leading-relaxed">
        Our AI is warming up. These results are based on pre-verified UK benefit data and will be accurate for most standard situations. Complex cases may benefit from advisor review.
      </p>
    </div>
  </div>
</template>
