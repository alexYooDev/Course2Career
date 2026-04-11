/**
 * UserProfile — compact form for degree level, year, and major.
 *
 * On "Auto-fill", calls onAutoFill with the deduced completed unit codes so
 * the parent can pre-populate the progress tracker.  The user can then
 * review and adjust.
 */

import { useState } from 'react'
import {
  type DegreeLevel,
  type MITMajor,
  type BachelorSpecialization,
  MIT_MAJORS,
  BACHELOR_SPECIALIZATIONS,
  BACHELOR_SEQUENCE_AVAILABLE,
  DEGREE_YEARS,
  deduceCompletedUnits,
} from '../utils/deduceUnits'

export interface UserProfileData {
  degree: DegreeLevel
  yearOfStudy: number
  semester: 1 | 2
  major: MITMajor | BachelorSpecialization | ''
}

/** Encode/decode a combined "Year X, Semester Y" value */
function encodeYS(year: number, sem: 1 | 2) { return `${year}-${sem}` }
function decodeYS(val: string): { year: number; sem: 1 | 2 } {
  const [y, s] = val.split('-').map(Number)
  return { year: y, sem: s as 1 | 2 }
}

interface Props {
  profile: UserProfileData
  onChange: (p: UserProfileData) => void
  onAutoFill: (codes: Set<string>) => void
}


export default function UserProfile({ profile, onChange, onAutoFill }: Props) {
  const [applied, setApplied] = useState(false)

  const years = DEGREE_YEARS[profile.degree]

  /** After any profile change, run deduction if conditions are met. */
  function applyAutoFill(next: UserProfileData) {
    const sd = (next.yearOfStudy - 1) * 2 + (next.semester - 1)
    const bachelorReady = next.degree === 'Bachelor' &&
      !!next.major && BACHELOR_SEQUENCE_AVAILABLE.has(next.major as BachelorSpecialization)
    const canFill = !!next.major && sd > 0 && (next.degree === 'Master' || bachelorReady)
    if (canFill) {
      onAutoFill(deduceCompletedUnits(next.degree, next.yearOfStudy, next.semester, next.major))
      setApplied(true)
    } else {
      onAutoFill(new Set())
      setApplied(false)
    }
  }

  function set<K extends keyof UserProfileData>(key: K, val: UserProfileData[K]) {
    const next = { ...profile, [key]: val }
    // When degree changes, reset major (different option lists)
    if (key === 'degree') next.major = ''
    // Clamp yearOfStudy to the valid range for the (possibly new) degree
    const maxYear = DEGREE_YEARS[next.degree].length
    if (next.yearOfStudy > maxYear) next.yearOfStudy = maxYear
    onChange(next)
    applyAutoFill(next)
  }

  // For display hints only
  const semDone = (profile.yearOfStudy - 1) * 2 + (profile.semester - 1)
  const bachelorSeqReady = profile.degree === 'Bachelor' &&
    !!profile.major && BACHELOR_SEQUENCE_AVAILABLE.has(profile.major as BachelorSpecialization)
  const canAutoFill = !!profile.major && semDone > 0 &&
    (profile.degree === 'Master' || bachelorSeqReady)

  return (
    <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-4 space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-sm font-semibold text-blue-900">Your Profile</span>
        <span className="text-xs text-blue-500">
          — auto-fill your likely completed units
        </span>
      </div>

      {/* ── Form row ──────────────────────────────────── */}
      <div className="flex flex-wrap gap-3">
        {/* Degree */}
        <div className="flex flex-col gap-1 min-w-[130px]">
          <label className="text-[10px] font-medium text-gray-500 uppercase tracking-wide">
            Degree
          </label>
          <select
            value={profile.degree}
            onChange={e => set('degree', e.target.value as DegreeLevel)}
            className="text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white
                       focus:outline-none focus:ring-2 focus:ring-blue-400/30 focus:border-blue-400"
          >
            <option value="Master">Master of IT</option>
            <option value="Bachelor">Bachelor of IT</option>
          </select>
        </div>

        {/* Year + Semester combined */}
        <div className="flex flex-col gap-1 min-w-[160px]">
          <label className="text-[10px] font-medium text-gray-500 uppercase tracking-wide">
            Current Study Period
          </label>
          <select
            value={encodeYS(profile.yearOfStudy, profile.semester)}
            onChange={e => {
              const { year, sem } = decodeYS(e.target.value)
              const next = { ...profile, yearOfStudy: year, semester: sem }
              const maxYear = DEGREE_YEARS[next.degree].length
              if (next.yearOfStudy > maxYear) next.yearOfStudy = maxYear
              onChange(next)
              applyAutoFill(next)
            }}
            className="text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white
                       focus:outline-none focus:ring-2 focus:ring-blue-400/30 focus:border-blue-400"
          >
            {years.flatMap(y => [1, 2].map(s => (
              <option key={`${y}-${s}`} value={encodeYS(y, s as 1 | 2)}>
                Year {y}, Semester {s}
              </option>
            )))}
          </select>
        </div>

        {/* Major / Specialization */}
        <div className="flex flex-col gap-1 min-w-[260px] flex-1">
          <label className="text-[10px] font-medium text-gray-500 uppercase tracking-wide">
            {profile.degree === 'Master' ? 'Major' : 'Specialization'}
          </label>
          <select
            value={profile.major}
            onChange={e => set('major', e.target.value as MITMajor | BachelorSpecialization | '')}
            className="text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white
                       focus:outline-none focus:ring-2 focus:ring-blue-400/30 focus:border-blue-400"
          >
            <option value="">— select a {profile.degree === 'Master' ? 'major' : 'specialization'} —</option>
            {profile.degree === 'Master'
              ? MIT_MAJORS.map(m => <option key={m} value={m}>{m}</option>)
              : BACHELOR_SPECIALIZATIONS.map(s => (
                  <option key={s} value={s}>
                    {s}{!BACHELOR_SEQUENCE_AVAILABLE.has(s) ? ' (coming soon)' : ''}
                  </option>
                ))
            }
          </select>
        </div>
      </div>

      {/* ── Status ────────────────────────────────────────── */}
      <div className="flex items-center gap-2 min-h-[22px]">
        {applied && (
          <span className="text-xs text-emerald-600 font-medium flex items-center gap-1">
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24"
                 stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            Units pre-filled — review and adjust below
          </span>
        )}
        {!canAutoFill && !profile.major && (
          <span className="text-xs text-gray-400">
            Select a {profile.degree === 'Master' ? 'major' : 'specialization'} to auto-fill completed units
          </span>
        )}
        {!canAutoFill && semDone === 0 && !!profile.major && (
          <span className="text-xs text-gray-400">
            Advance to Semester 2 to start auto-filling
          </span>
        )}
        {!canAutoFill && profile.degree === 'Bachelor' && !!profile.major && semDone > 0 && !bachelorSeqReady && (
          <span className="text-xs text-gray-400">
            Sequence for this specialization coming soon
          </span>
        )}
      </div>
    </div>
  )
}
