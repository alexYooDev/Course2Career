/**
 * frontend/src/App.tsx
 *
 * Root orchestrator for the Course2Career single-page application.
 *
 * Layout (top → bottom):
 *   1. Sticky nav header
 *   2. Section 1 — JobSearch  (Find a Job)
 *   3. Section 2 — RecommendationPanel  (shown after "Get Recommendations")
 *   4. Section 3 — UnitList  (Your Progress, collapsible)
 *
 * State that must be shared across sections lives here:
 *   completedUnits  — passed to both RecommendationPanel and UnitList so
 *                     toggling a unit in one section is reflected in the other.
 *   jobDescription  — the active JD text (owned by JobSearch, lifted here
 *                     so App can include it in the recommendations request).
 *   recommendations — the API response; null until first successful call.
 *   recLoading      — true while the POST /api/recommendations call is live.
 *   recError        — non-null on API failure.
 */

import { useState } from 'react'
import { recommendationApi } from './services/api'
import type { RecommendationResponse } from './types'
import JobSearch from './components/JobSearch'
import RecommendationPanel from './components/RecommendationPanel'
import UnitProgress from './components/UnitProgress'
import WelcomeGuide from './components/WelcomeGuide'
import UserProfile, { type UserProfileData } from './components/UserProfile'

export default function App() {
  // ── Shared completion state ──────────────────────────────────────────────
  const [completedUnits, setCompletedUnits] = useState<Set<string>>(new Set())

  function toggleCompleted(code: string) {
    setCompletedUnits(prev => {
      const next = new Set(prev)
      next.has(code) ? next.delete(code) : next.add(code)
      return next
    })
  }

  // ── User profile ─────────────────────────────────────────────────────────
  const [profile, setProfile] = useState<UserProfileData>({
    degree: 'Master',
    yearOfStudy: 1,
    semester: 1,
    major: '',
  })

  function handleAutoFill(codes: Set<string>) {
    setCompletedUnits(codes)
    // Keep any manually-added completions that aren't in the deduced set
  }

  // ── Job description state (lifted from JobSearch) ────────────────────────
  const [jobDescription, setJobDescription] = useState('')

  // ── Recommendation state ─────────────────────────────────────────────────
  const [recommendations, setRecommendations] = useState<RecommendationResponse | null>(null)
  const [recLoading, setRecLoading] = useState(false)
  const [recError, setRecError] = useState<string | null>(null)

  // ── Get Recommendations handler ──────────────────────────────────────────
  async function getRecommendations() {
    setRecLoading(true)
    setRecError(null)
    try {
      const result = await recommendationApi.get({
        job_description: jobDescription,
        completed_units: [...completedUnits],
        program: profile.degree,
        year_of_study: profile.yearOfStudy,
        major: profile.major,
        top_k: 5,
      })
      setRecommendations(result)
    } catch {
      setRecError('Failed to get recommendations. Please check the backend connection and try again.')
    } finally {
      setRecLoading(false)
    }
  }

  return (
    <div className='min-h-screen bg-gray-50'>
      {/* ── Nav ─────────────────────────────────────────────────────────── */}
      <header className='sticky top-0 z-10 bg-white border-b border-gray-200 shadow-sm'>
        <div className='max-w-6xl mx-auto px-6 py-3 flex items-center gap-3'>
          <div className='w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shrink-0'>
            <span className='text-white font-bold text-sm'>C2</span>
          </div>
          <div>
            <h1 className='text-base font-semibold text-gray-900 leading-none'>
              Course2Career
            </h1>
            <p className='text-[11px] text-gray-400 mt-0.5'>
              QUT IT Career Path Advisor
            </p>
          </div>

          {/* Completed counter pill (right-aligned) */}
          {completedUnits.size > 0 && (
            <div className='ml-auto'>
              <span className='inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full'>
                <svg
                  className='w-3 h-3'
                  fill='none'
                  viewBox='0 0 24 24'
                  stroke='currentColor'
                  strokeWidth={2.5}
                >
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    d='M5 13l4 4L19 7'
                  />
                </svg>
                {completedUnits.size} unit{completedUnits.size !== 1 ? 's' : ''}{' '}
                completed
              </span>
            </div>
          )}
        </div>
      </header>

      {/* ── Main ────────────────────────────────────────────────────────── */}
      <main className='max-w-6xl mx-auto px-6 py-8 space-y-8'>
        {/* ── Welcome guide (first-time state) ─────────────────────────── */}
        {!recLoading && !recError && !recommendations && (
          <WelcomeGuide />
        )}
        {/* ── Section 1: Your Progress ──────────────────────────────────── */}
        <section className='bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden'>
          <div className='px-6 py-4 flex items-center gap-3 border-b border-gray-100'>
            <h2 className='text-base font-semibold text-gray-900'>Your Progress</h2>
            {completedUnits.size > 0 && (
              <span className='text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full'>
                {completedUnits.size} completed
              </span>
            )}
          </div>
          <div className='px-6 pb-6 pt-5 space-y-5'>
            <UserProfile
              profile={profile}
              onChange={setProfile}
              onAutoFill={handleAutoFill}
            />
            <UnitProgress
              completedUnits={completedUnits}
              onToggle={toggleCompleted}
              degree={profile.degree}
              major={profile.major}
            />
          </div>
        </section>

        {/* ── Section 2: Find a Job ──────────────────────────────────────── */}
        <JobSearch
          onJdChange={setJobDescription}
          onGetRecommendations={getRecommendations}
          isLoading={recLoading}
        />

        {/* ── Section 3: Recommendations ────────────────────────────────── */}
        {(recLoading || recError || recommendations) && (
          <div>
            {/* Loading state */}
            {recLoading && (
              <div className='flex flex-col items-center justify-center py-16 gap-4'>
                <div className='w-10 h-10 border-[3px] border-blue-600 border-t-transparent rounded-full animate-spin' />
                <div className='text-center'>
                  <p className='text-sm font-medium text-gray-700'>
                    Analysing job description…
                  </p>
                  <p className='text-xs text-gray-400 mt-1'>
                    This may take a few seconds
                  </p>
                </div>
              </div>
            )}

            {/* Error state */}
            {!recLoading && recError && (
              <div className='rounded-xl border border-red-200 bg-red-50 p-5 space-y-2'>
                <div className='flex items-center gap-2'>
                  <svg
                    className='w-4 h-4 text-red-500 shrink-0'
                    fill='none'
                    viewBox='0 0 24 24'
                    stroke='currentColor'
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap='round'
                      strokeLinejoin='round'
                      d='M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z'
                    />
                  </svg>
                  <p className='text-sm font-semibold text-red-700'>
                    Recommendation failed
                  </p>
                </div>
                <p className='text-sm text-red-600'>{recError}</p>
                <button
                  onClick={getRecommendations}
                  disabled={!jobDescription.trim()}
                  className='text-xs font-medium text-red-700 underline hover:no-underline disabled:opacity-50'
                >
                  Try again
                </button>
              </div>
            )}

            {/* Success state */}
            {!recLoading && !recError && recommendations && (
              <RecommendationPanel
                recommendations={recommendations}
                completedUnits={completedUnits}
                onToggle={toggleCompleted}
              />
            )}
          </div>
        )}
      </main>
    </div>
  );
}
