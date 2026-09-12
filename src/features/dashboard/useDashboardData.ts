import { useCallback, useEffect, useRef, useState } from 'react'
import { loadDashboardData, type DashboardData } from './dashboard-data'

let cache: { at: number; data: DashboardData } | null = null
const TTL_MS = 60_000

export function useDashboardData() {
  const [data, setData] = useState<DashboardData | null>(cache?.data ?? null)
  const [loading, setLoading] = useState(!cache)
  const [error, setError] = useState<string | null>(null)
  const active = useRef(true)

  const refresh = useCallback(async (force = false) => {
    if (!force && cache && Date.now() - cache.at < TTL_MS) {
      setData(cache.data)
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const next = await loadDashboardData()
      cache = { at: Date.now(), data: next }
      if (active.current) {
        setData(next)
        setError(null)
      }
    } catch (caught) {
      if (active.current) setError(caught instanceof Error ? caught.message : 'Dashboard unavailable.')
    } finally {
      if (active.current) setLoading(false)
    }
  }, [])

  useEffect(() => {
    active.current = true
    void refresh()
    return () => {
      active.current = false
    }
  }, [refresh])

  return { data, loading, error, refresh }
}
