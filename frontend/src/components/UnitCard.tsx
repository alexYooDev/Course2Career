/**
 * frontend/src/components/UnitCard.tsx
 *
 * Displays a single QUT unit.  Used in both the catalogue view (UnitList)
 * and the recommendations dashboard (future).
 *
 * Props
 * -----
 * unit           — the unit data
 * score          — optional cosine similarity score (shown in recommendations)
 * isCompleted    — whether the student has completed this unit
 * onToggle       — callback to mark/unmark as completed
 */

import { useState } from 'react'
import type { Unit } from '../types'

interface Props {
  unit: Unit
  score?: number
  isCompleted?: boolean
  onToggle?: (unitCode: string) => void
  gapSkills?: string[]
}

export default function UnitCard({ unit, score, isCompleted = false, onToggle, gapSkills }: Props) {
  const [expanded, setExpanded] = useState(false)

  const scorePercent = score !== undefined ? Math.round(score * 100) : null

  // Colour the score badge by strength
  const scoreBadgeClass =
    scorePercent === null
      ? ''
      : scorePercent >= 65
      ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
      : scorePercent >= 40
      ? 'text-amber-700 bg-amber-50 border-amber-200'
      : 'text-gray-600 bg-gray-50 border-gray-200'

  return (
    <article
      className={`flex flex-col rounded-xl border shadow-sm overflow-hidden transition-shadow hover:shadow-md
        ${isCompleted ? 'border-emerald-200 bg-emerald-50/20' : 'border-gray-200 bg-white'}`}
    >
      {/* ── Header ─────────────────────────────────────────────── */}
      <div className='p-5 flex-1'>
        <div className='flex items-start justify-between gap-3'>
          {/* Unit code + title */}
          <div className='flex items-start gap-3 min-w-0'>
            <span className='shrink-0 inline-block bg-blue-600 text-white text-xs font-bold px-2.5 py-1 rounded-md'>
              {unit.unit_code}
            </span>
            <h3 className='font-semibold text-gray-900 leading-snug text-sm'>
              {unit.title || (
                <span className='text-gray-400 italic'>Untitled unit</span>
              )}
            </h3>
          </div>

          {/* Right-side controls */}
          <div className='flex items-center gap-2 shrink-0'>
            {scorePercent !== null && (
              <span
                className={`text-xs font-semibold px-2 py-0.5 rounded border ${scoreBadgeClass}`}
              >
                {scorePercent}%
              </span>
            )}

            {onToggle && (
              <button
                onClick={() => onToggle(unit.unit_code)}
                title={
                  isCompleted ? 'Mark as not completed' : 'Mark as completed'
                }
                className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors
                  ${
                    isCompleted
                      ? 'border-emerald-500 bg-emerald-500 text-white'
                      : 'border-gray-300 hover:border-emerald-400'
                  }`}
              >
                {isCompleted && (
                  <svg
                    className='w-2.5 h-2.5'
                    fill='none'
                    viewBox='0 0 24 24'
                    stroke='currentColor'
                    strokeWidth={3}
                  >
                    <path
                      strokeLinecap='round'
                      strokeLinejoin='round'
                      d='M5 13l4 4L19 7'
                    />
                  </svg>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Meta badges */}
        <div className='flex flex-wrap gap-1.5 mt-2.5'>
          {unit.credit_points && (
            <span className='text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded'>
              {unit.credit_points} CP
            </span>
          )}
          {unit.study_period && (
            <span className='text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded'>
              {unit.study_period} {unit.year}
            </span>
          )}
        </div>

        {/* Pre-requisite */}
        {unit.pre_requisite && (
          <p className='mt-2.5 text-xs text-amber-800 bg-amber-50 border border-amber-100 px-2.5 py-1.5 rounded-md'>
            <span className='font-medium'>Pre-req:</span> {unit.pre_requisite}
          </p>
        )}

        {/* Content preview */}
        {unit.content && (
          <p className='mt-2.5 text-xs text-gray-500 line-clamp-2 leading-relaxed'>
            {unit.content}
          </p>
        )}

        {/* Gap skill tags */}
        {gapSkills && gapSkills.length > 0 && (
          <div className='mt-2.5 flex flex-wrap gap-1.5'>
            <span className='text-xs text-gray-400 mr-0.5'>Skill gaps:</span>
            {gapSkills.map((skill, i) => (
              <span
                key={i}
                className='text-xs text-rose-700 bg-rose-50 border border-rose-100 px-2 py-0.5 rounded-full'
              >
                {skill}
              </span>
            ))}
          </div>
        )}

        <a
          href={`https://www.qut.edu.au/study/unit?unitCode=${unit.unit_code}`}
          target='_blank'
          rel='noopener noreferrer'
          className='inline-flex items-center gap-1 text-xs font-medium text-blue-600
                         hover:text-blue-700 hover:underline transition-colors'
        >
          For more details
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
              d='M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14'
            />
          </svg>
        </a>
      </div>
      {/* ── Collapsible Learning Outcomes ──────────────────────── */}
      {unit.learning_outcomes.length > 0 && (
        <div className='border-t border-gray-100'>
          <button
            onClick={() => setExpanded((v) => !v)}
            className='w-full flex items-center justify-between px-5 py-2.5 text-xs font-medium text-gray-500 hover:bg-gray-50 transition-colors'
          >
            <span>Learning Outcomes ({unit.learning_outcomes.length})</span>
            <svg
              className={`w-3.5 h-3.5 transition-transform ${expanded ? 'rotate-180' : ''}`}
              fill='none'
              viewBox='0 0 24 24'
              stroke='currentColor'
            >
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth={2}
                d='M19 9l-7 7-7-7'
              />
            </svg>
          </button>

          {expanded && (
            <ul className='px-5 pb-4 space-y-1.5'>
              {unit.learning_outcomes.map((lo, i) => (
                <li
                  key={i}
                  className='flex gap-2 text-xs text-gray-600 leading-relaxed'
                >
                  <span className='shrink-0 text-blue-400 font-semibold'>
                    {i + 1}.
                  </span>
                  <span>{lo}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </article>
  );
}
