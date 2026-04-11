/**
 * frontend/src/hooks/useUnits.ts
 *
 * Custom hook that fetches all QUT units from the backend on mount.
 * Provides loading, error, and refetch states to consuming components.
 */

import { useCallback, useEffect, useState } from 'react'
import { unitApi } from '../services/api'
import type { Unit } from '../types'

interface UseUnitsResult {
  units: Unit[]
  loading: boolean
  error: string | null
  refetch: () => void
}

export function useUnits(): UseUnitsResult {
  const [units, setUnits] = useState<Unit[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetch = useCallback(() => {
    setLoading(true)
    setError(null)
    unitApi
      .getAll()
      .then(setUnits)
      .catch(err => {
        const message =
          err?.response?.data?.detail ?? err?.message ?? 'Unknown error'
        setError(message)
      })
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    fetch()
  }, [fetch])

  return { units, loading, error, refetch: fetch }
}
