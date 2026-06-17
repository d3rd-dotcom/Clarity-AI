import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { AssessResponse } from '@/types'

export const useResultsStore = defineStore('results', () => {
  const data = ref<AssessResponse | null>(null)
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  function setData(response: AssessResponse) {
    data.value = response
    error.value = null
    isLoading.value = false
  }

  function setLoading(loading: boolean) {
    isLoading.value = loading
    if (loading) error.value = null
  }

  function setError(message: string) {
    error.value = message
    isLoading.value = false
    data.value = null
  }

  function reset() {
    data.value = null
    isLoading.value = false
    error.value = null
  }

  return { data, isLoading, error, setData, setLoading, setError, reset }
})
