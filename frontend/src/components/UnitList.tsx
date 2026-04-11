/**
 * frontend/src/components/UnitList.tsx
 *
 * Fetches the full unit catalogue from ChromaDB (via GET /api/units) and
 * renders it as a responsive grid of UnitCards.
 *
 * Completed-unit state can be either:
 *   • Controlled  — parent passes `completedUnits` + `onToggle` props.
 *                   Used by App.tsx so the same completed set is shared
 *                   across the recommendations panel and this catalogue.
 *   • Uncontrolled — props omitted → component manages its own local state.
 *                   Useful when UnitList is rendered standalone.
 *
 * Handles three async states:
 *   loading  — spinner while the backend responds
 *   error    — actionable message if the backend is unreachable
 *   empty    — guidance when ChromaDB has no units yet
 */

import { useState } from 'react'
import { useUnits } from '../hooks/useUnits'
import { unitApi } from '../services/api'
import UnitCard from './UnitCard'

interface Props {
  /** Controlled: set of completed unit codes owned by the parent. */
  completedUnits?: Set<string>
  /** Controlled: toggle handler owned by the parent. */
  onToggle?: (code: string) => void
}

export default function UnitList({ completedUnits: externalCompleted, onToggle: externalToggle }: Props) {
  const { units, loading, error, refetch } = useUnits()

  // ── Uncontrolled fallback state ─────────────────────────────────────────
  const [internalCompleted, setInternalCompleted] = useState<Set<string>>(new Set())
  const [ingesting, setIngesting] = useState(false)

  // Resolve which completed set + toggle to use
  const isControlled = externalCompleted !== undefined && externalToggle !== undefined
  const completedUnits = isControlled ? externalCompleted : internalCompleted

  function toggleCompleted(code: string) {
    if (isControlled) {
      externalToggle!(code)
    } else {
      setInternalCompleted(prev => {
        const next = new Set(prev)
        next.has(code) ? next.delete(code) : next.add(code)
        return next
      })
    }
  }

  async function handleIngest() {
    setIngesting(true)
    try {
      const result = await unitApi.ingest()
      alert(`Ingested ${result.ingested} unit(s). Total in DB: ${result.total_in_db}`)
      refetch()
    } catch {
      alert('Ingestion failed — check the backend logs.')
    } finally {
      setIngesting(false)
    }
  }

  // ── Loading ──────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 gap-3 text-gray-500">
        <div className="w-6 h-6 border-[3px] border-blue-600 border-t-transparent rounded-full animate-spin" />
        <span className="text-sm">Loading units from ChromaDB…</span>
      </div>
    )
  }

  // ── Error ────────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-700 space-y-2">
        <p className="font-semibold">Could not load units</p>
        <p className="text-red-600">{error}</p>
        <p className="text-xs text-red-500">
          Is the FastAPI backend running?{' '}
          <code className="bg-red-100 px-1 rounded">
            uvicorn backend.src.main:app --reload
          </code>
        </p>
        <button
          onClick={refetch}
          className="mt-2 text-xs font-medium text-red-700 underline hover:no-underline"
        >
          Retry
        </button>
      </div>
    )
  }

  // ── Empty ────────────────────────────────────────────────────────────────
  if (units.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-gray-50 p-10 text-center space-y-3">
        <p className="font-medium text-gray-700">No units in ChromaDB yet</p>
        <p className="text-sm text-gray-500">
          Add unit JSON files to <code className="bg-gray-100 px-1 rounded">utils/</code> and
          click Ingest.
        </p>
        <button
          onClick={handleIngest}
          disabled={ingesting}
          className="mt-2 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {ingesting ? 'Ingesting…' : 'Ingest Units'}
        </button>
      </div>
    )
  }

  // ── Units grid ───────────────────────────────────────────────────────────
  const completedCount = [...completedUnits].filter(c =>
    units.some(u => u.unit_code === c)
  ).length

  return (
    <div>
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">QUT Unit Catalogue</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            {units.length} unit{units.length !== 1 ? 's' : ''} in ChromaDB
            {completedCount > 0 && (
              <span className="ml-2 text-emerald-600 font-medium">
                · {completedCount} completed
              </span>
            )}
          </p>
        </div>
        <button
          onClick={handleIngest}
          disabled={ingesting}
          className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition-colors"
        >
          {ingesting ? 'Ingesting…' : '↻ Refresh'}
        </button>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {units.map(unit => (
          <UnitCard
            key={unit.unit_code}
            unit={unit}
            isCompleted={completedUnits.has(unit.unit_code)}
            onToggle={toggleCompleted}
          />
        ))}
      </div>
    </div>
  )
}
