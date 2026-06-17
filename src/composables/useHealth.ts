import { ref, readonly } from 'vue'
import type { HealthResponse } from '@/types'

const API_BASE = import.meta.env.VITE_API_URL ?? ''

// Singleton — health check runs once per page load, result shared everywhere
const status = ref<'ok' | 'degraded' | 'unknown'>('unknown')
let fetched = false

export function useHealth() {
  async function checkHealth() {
    if (fetched) return
    fetched = true

    try {
      const response = await fetch(`${API_BASE}/api/health`, {
        signal: AbortSignal.timeout(5_000), // 5s is enough for a health check
      })
      if (!response.ok) {
        status.value = 'degraded'
        return
      }
      const data = (await response.json()) as HealthResponse
      status.value = data.status
    } catch {
      status.value = 'degraded'
    }
  }

  return { status: readonly(status), checkHealth }
}
