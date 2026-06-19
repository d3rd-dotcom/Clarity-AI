import { ref, readonly } from 'vue'

type HealthResponse = {
  status: 'ok' | 'degraded' | 'unknown'
}

const API_BASE = import.meta.env.VITE_API_URL ?? ''

// PERF-002 fix: a single failed health check (e.g. cold-start latency on
// the hackathon demo backend, or a brief network hiccup) used to
// permanently set status to 'degraded' for the rest of the session because
// of the `fetched` singleton guard. A judge could open the app during a
// cold start, see "Service degraded", and that impression would persist
// even after the backend was fully warmed up and healthy. We now retry
// with exponential backoff before giving up.
const MAX_ATTEMPTS = 3
const BACKOFF_BASE_MS = 2_000 // 2s, 4s, ...
const REQUEST_TIMEOUT_MS = 5_000

// Singleton — health check runs once per page load, result shared everywhere
const status = ref<'ok' | 'degraded' | 'unknown'>('unknown')
let started = false
let attempts = 0

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function attempt(): Promise<void> {
  attempts++

  try {
    const response = await fetch(`${API_BASE}/api/health`, {
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    })

    if (!response.ok) {
      throw new Error(`Health check returned ${response.status}`)
    }

    const data = (await response.json()) as HealthResponse
    status.value = data.status
    return
  } catch {
    if (attempts < MAX_ATTEMPTS) {
      await delay(attempts * BACKOFF_BASE_MS)
      return attempt()
    }
    // Exhausted all retries — genuinely degraded (or unreachable)
    status.value = 'degraded'
  }
}

export function useHealth() {
  async function checkHealth() {
    if (started) return
    started = true
    await attempt()
  }

  return { status: readonly(status), checkHealth }
}
