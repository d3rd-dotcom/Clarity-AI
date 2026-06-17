import { useResultsStore } from '@/stores/resultsStore'
import { useFormStore } from '@/stores/formStore'
import { useRouter } from 'vue-router'
import type { AssessRequest, AssessResponse } from '@/types'

// API base: empty string means same origin (works for both dev proxy and production)
const API_BASE = import.meta.env.VITE_API_URL ?? ''

export function useAssess() {
  const resultsStore = useResultsStore()
  const formStore = useFormStore()
  const router = useRouter()

  async function submitAssessment() {
    // Guard: should not be callable unless form is complete
    if (!formStore.isComplete) return

    // Build the typed request payload
    // We know all fields are non-null because isComplete is true
    const payload: AssessRequest = {
      employment_status: formStore.answers.employment_status!,
      household_situation: formStore.answers.household_situation!,
      housing_situation: formStore.answers.housing_situation!,
      age_range: formStore.answers.age_range!,
      health_disability: formStore.answers.health_disability!,
      num_children: formStore.answers.num_children,
    }

    resultsStore.setLoading(true)

    // Navigate to results immediately — loading screen renders there
    await router.push('/results')

    try {
      const controller = new AbortController()
      // 30s timeout — generous for cold-start Cerebras
      const timeout = setTimeout(() => controller.abort(), 30_000)

      const response = await fetch(`${API_BASE}/api/assess`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal,
      })

      clearTimeout(timeout)

      if (!response.ok) {
        // Server returned an error status
        const errorText = await response.text().catch(() => 'Unknown error')
        throw new Error(`Server error ${response.status}: ${errorText}`)
      }

      const data = (await response.json()) as AssessResponse

      if (!data.success || !Array.isArray(data.benefits)) {
        throw new Error('Unexpected response format from server')
      }

      resultsStore.setData(data)
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        resultsStore.setError(
          'The check is taking longer than usual. Please try again.',
        )
      } else {
        resultsStore.setError(
          'We could not connect to the eligibility service. Please check your internet connection and try again.',
        )
      }
    }
  }

  return { submitAssessment }
}
