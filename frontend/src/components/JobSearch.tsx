/**
 * frontend/src/components/JobSearch.tsx
 *
 * Section 1 — "Find a Job"
 *
 * Two tabs:
 *   Search  — job query + optional location → scrollable list of Job cards
 *   Paste JD — raw textarea for pasting a job description directly
 *
 * Clicking a job card selects it and opens a description modal.
 * "Get Recommendations" is shown once a JD is active.
 */

import { useState, useEffect, useRef } from 'react'
import { jobApi } from '../services/api'
import type { Job } from '../types'

interface Props {
  onJdChange: (jd: string) => void
  onGetRecommendations: () => void
  isLoading: boolean
}

type Tab = 'search' | 'paste'

export default function JobSearch({ onJdChange, onGetRecommendations, isLoading }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('search')

  // Search tab
  const [query, setQuery] = useState('')
  const [location, setLocation] = useState('')
  const [jobs, setJobs] = useState<Job[]>([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)
  const [selectedJob, setSelectedJob] = useState<Job | null>(null)
  const [modalJob, setModalJob] = useState<Job | null>(null)

  // Paste tab
  const [pastedJd, setPastedJd] = useState('')

  const activeJd = activeTab === 'search'
    ? (selectedJob?.description ?? '')
    : pastedJd

  async function handleSearch() {
    if (!query.trim()) return
    setSearchLoading(true)
    setSearchError(null)
    setJobs([])
    setSelectedJob(null)
    onJdChange('')
    try {
      const results = await jobApi.search(query.trim(), {
        where: location.trim() || undefined,
        limit: 10,
      })
      setJobs(results)
    } catch {
      setSearchError('Job search failed — check the backend connection.')
    } finally {
      setSearchLoading(false)
    }
  }

  function handleJobSelect(job: Job) {
    setSelectedJob(job)
    onJdChange(job.description)
    setModalJob(job)
  }

  function handlePasteChange(value: string) {
    setPastedJd(value)
    onJdChange(value)
  }

  function handleTabSwitch(tab: Tab) {
    setActiveTab(tab)
    onJdChange(tab === 'search' ? (selectedJob?.description ?? '') : pastedJd)
  }

  function formatSalary(min: number | null, max: number | null): string {
    if (min === null && max === null) return ''
    const fmt = (n: number) => n >= 1000 ? `$${Math.round(n / 1000)}k` : `$${n}`
    if (min !== null && max !== null) return `${fmt(min)} – ${fmt(max)}`
    if (min !== null) return `From ${fmt(min)}`
    return `Up to ${fmt(max!)}`
  }

  return (
    <section className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      {/* ── Section header ─────────────────────────────────────────────────── */}
      <div className="px-6 pt-5 pb-4 border-b border-gray-100">
        <h2 className="text-base font-semibold text-gray-900">Find a Job</h2>
        <p className="text-sm text-gray-500 mt-0.5">
          Search live listings or paste a job description to get personalised unit recommendations.
        </p>
      </div>

      {/* ── Tabs ───────────────────────────────────────────────────────────── */}
      <div className="flex border-b border-gray-200 px-6">
        {(['search', 'paste'] as Tab[]).map(tab => (
          <button
            key={tab}
            onClick={() => handleTabSwitch(tab)}
            className={`py-3 px-1 mr-6 text-sm font-medium border-b-2 transition-colors
              ${activeTab === tab
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
          >
            {tab === 'search' ? 'Search Jobs' : 'Paste JD'}
          </button>
        ))}
      </div>

      <div className="p-6 space-y-4">
        {/* ── Search tab ─────────────────────────────────────────────────────── */}
        {activeTab === 'search' && (
          <div className="space-y-4">
            <div className="flex gap-3 flex-wrap sm:flex-nowrap">
              <input
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSearch()}
                placeholder="Job title or keywords (e.g. Software Engineer)"
                className="flex-1 min-w-0 border border-gray-300 rounded-lg px-3 py-2 text-sm
                           text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2
                           focus:ring-blue-500 focus:border-transparent"
              />
              <input
                type="text"
                value={location}
                onChange={e => setLocation(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSearch()}
                placeholder="Location (optional)"
                className="w-full sm:w-44 border border-gray-300 rounded-lg px-3 py-2 text-sm
                           text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2
                           focus:ring-blue-500 focus:border-transparent"
              />
              <button
                onClick={handleSearch}
                disabled={searchLoading || !query.trim()}
                className="shrink-0 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg
                           hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {searchLoading ? (
                  <span className="flex items-center gap-2">
                    <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Searching…
                  </span>
                ) : 'Search'}
              </button>
            </div>

            {searchError && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                {searchError}
              </p>
            )}

            {jobs.length > 0 && (
              <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                <p className="text-xs text-gray-500 font-medium">
                  {jobs.length} result{jobs.length !== 1 ? 's' : ''} — click a job to view its description
                </p>
                {jobs.map(job => {
                  const isSelected = selectedJob?.job_id === job.job_id
                  const salary = formatSalary(job.salary_min, job.salary_max)
                  return (
                    <button
                      key={job.job_id}
                      onClick={() => handleJobSelect(job)}
                      className={`w-full text-left rounded-lg border px-4 py-3 transition-all
                        ${isSelected
                          ? 'border-blue-400 bg-blue-50 ring-1 ring-blue-400'
                          : 'border-gray-200 bg-white hover:border-blue-300 hover:bg-blue-50/40'
                        }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-gray-900 truncate">{job.title}</p>
                          <p className="text-xs text-gray-500 mt-0.5 truncate">
                            {job.company}{job.location ? ` · ${job.location}` : ''}
                          </p>
                        </div>
                        <div className="flex flex-col items-end gap-1 shrink-0">
                          {salary && (
                            <span className="text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                              {salary}
                            </span>
                          )}
                          {isSelected && (
                            <span className="text-xs font-medium text-blue-600 flex items-center gap-1">
                              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24"
                                   stroke="currentColor" strokeWidth={2.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                              </svg>
                              Selected
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            )}

            {!searchLoading && jobs.length === 0 && query.trim() && !searchError && (
              <p className="text-sm text-gray-400 italic">No jobs found. Try a different query.</p>
            )}
          </div>
        )}

        {/* ── Paste JD tab ───────────────────────────────────────────────────── */}
        {activeTab === 'paste' && (
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">Job Description</label>
            <textarea
              value={pastedJd}
              onChange={e => handlePasteChange(e.target.value)}
              placeholder="Paste a full job description here…"
              rows={10}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900
                         placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500
                         focus:border-transparent resize-y"
            />
            <p className="text-xs text-gray-400">
              {pastedJd.trim().length} character{pastedJd.trim().length !== 1 ? 's' : ''}
            </p>
          </div>
        )}

        {/* ── CTA ──────────────────────────────────────────────────────────── */}
        <div className="flex items-center gap-3">
          <button
            onClick={onGetRecommendations}
            disabled={!activeJd.trim() || isLoading}
            className="px-5 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-lg
                       hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed
                       transition-colors flex items-center gap-2"
          >
            {isLoading ? (
              <>
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Analysing…
              </>
            ) : 'Get Recommendations →'}
          </button>
          {activeJd.trim() && !isLoading && (
            <span className="text-xs text-gray-400">
              {activeJd.trim().length.toLocaleString()} chars ready
            </span>
          )}
        </div>
      </div>

      {/* ── Job Description Modal ─────────────────────────────────────────── */}
      {modalJob && (
        <JdModal
          job={modalJob}
          onClose={() => setModalJob(null)}
          onAnalyze={() => { setModalJob(null); onGetRecommendations() }}
          isLoading={isLoading}
        />
      )}
    </section>
  )
}

// ── Modal ─────────────────────────────────────────────────────────────────────

function JdModal({ job, onClose, onAnalyze, isLoading }: {
  job: Job
  onClose: () => void
  onAnalyze: () => void
  isLoading: boolean
}) {
  const overlayRef = useRef<HTMLDivElement>(null)

  // Close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div
      ref={overlayRef}
      onClick={e => { if (e.target === overlayRef.current) onClose() }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
    >
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col overflow-hidden">
        {/* Modal header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-base font-semibold text-gray-900 leading-snug">{job.title}</h3>
            <p className="text-sm text-gray-500 mt-0.5">
              {job.company}{job.location ? ` · ${job.location}` : ''}
            </p>
          </div>
          <button
            onClick={onClose}
            className="shrink-0 text-gray-400 hover:text-gray-600 transition-colors mt-0.5"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24"
                 stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Scrollable description */}
        <div className="px-6 py-5 overflow-y-auto flex-1">
          <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">
            {job.description}
          </p>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between gap-3">
          {job.redirect_url && (
            <a
              href={job.redirect_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-600 hover:underline flex items-center gap-1"
            >
              View full listing
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24"
                   stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round"
                      d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          )}
          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={onClose}
              className="text-xs font-medium text-gray-500 hover:text-gray-700 px-3 py-1.5
                         border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Close
            </button>
            <button
              onClick={onAnalyze}
              disabled={isLoading}
              className="flex items-center gap-2 px-4 py-1.5 bg-blue-600 text-white text-xs
                         font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50
                         disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Analysing…
                </>
              ) : 'Analyze →'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
