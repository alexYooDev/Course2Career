/**
 * UnitProgress — two-level grouped progress tracker.
 *
 * Shows MIT structure for Master students and Bachelor structure for Bachelor
 * students.  Bachelor units are defined statically (they are not yet in
 * ChromaDB) and will enrich with DB data once ingested.
 */

import { useState, useMemo } from 'react'
import { useUnits } from '../hooks/useUnits'
import type { Unit } from '../types'
import type { DegreeLevel } from '../utils/deduceUnits'

interface Props {
  completedUnits: Set<string>
  onToggle: (code: string) => void
  degree: DegreeLevel
  major: string   // current MIT major or Bachelor specialization
}

// ── Static unit titles for Bachelor units (not yet in ChromaDB) ──────────────

const BACHELOR_UNIT_TITLES: Record<string, string> = {
  // Year 1 core — common to all specializations
  IFB102: 'Introduction to Computer Systems',
  IFB103: 'IT Systems Design',
  IFB104: 'Introduction to Programming',
  IFB105: 'Database Management',
  IFB201: 'Introduction to Enterprise Computing',
  IFB220: 'Introduction to AI for IT Professionals',
  IFB240: 'Cyber Security',
  // Shared major/capstone units
  IFB398: 'IT Capstone Project (Phase 1)',
  IFB399: 'IT Capstone Project (Phase 2)',
  // Artificial Intelligence
  CAB201: 'Object-Oriented Programming and Design',
  IFB320: 'Generative AI',
  IAB353: 'Data Analytics for Enterprise Systems',
  CAB330: 'Machine Learning for Decision Making',
  DSB102: 'Introduction to Machine Learning',
  CAB420: 'Machine Learning',
  // Business Analysis & IT Management
  IAB203: 'Process Modelling',
  IAB204: 'Business Analysis for IT Systems',
  IAB305: 'IT Strategy and Management',
  IAB402: 'IT Consulting and Leadership',
  IAB401: 'Enterprise Architecture',
}

// ── MIT course structure ──────────────────────────────────────────────────────

type SubGroup = { label: string; codes: string[] }
type Category = { label: string; icon: string; subGroups: SubGroup[] }

const MIT_STRUCTURE: Category[] = [
  {
    label: 'Core Units',
    icon: '📚',
    subGroups: [
      {
        label: 'Foundational Core',
        codes: ['IFN581', 'IFN582', 'IFN583', 'IFN585'],
      },
      {
        label: 'Advanced Core',
        codes: ['IFN580', 'IFN584', 'IFN635', 'IFN636', 'IFN637'],
      },
      {
        label: 'Capstone',
        codes: ['INN700', 'IFN735', 'IFN736', 'IFN737', 'IFN738'],
      },
    ],
  },
  {
    label: 'Major Electives',
    icon: '🎓',
    subGroups: [
      {
        label: 'Computer Science',
        codes: ['CAB401', 'CAB402', 'CAB432', 'IFB452', 'IFN509', 'IFN645',
                'IFN647', 'IFN648', 'IFN649', 'IFN657', 'IFN658', 'IFN666',
                'IFN680', 'IFN692'],
      },
      {
        label: 'Data Science',
        codes: ['IFN509', 'MXN500', 'IFN645', 'IFN646', 'IFN647', 'IFN650',
                'IFN655', 'IFN680'],
      },
      {
        label: 'Human-Centred Design',
        codes: ['IFN521', 'IFN623', 'IFN637', 'IFN664', 'IFN692', 'IFN694'],
      },
      {
        label: 'Internet of Things',
        codes: ['ENN523', 'ENN524', 'IFN649', 'IFN663', 'IFN667'],
      },
      {
        label: 'IT Management',
        codes: ['IAB402', 'IFN515', 'IFN561', 'IFN562', 'IFN619', 'IFN631',
                'IFN652', 'IFN654', 'IFN655', 'IFN663'],
      },
      {
        label: 'Process Analytics & Automation',
        codes: ['IFN515', 'IFN650', 'IFN652', 'IFN653', 'IFN654'],
      },
      {
        label: 'Software Development',
        codes: ['IFN584', 'IFN662', 'IFN663', 'IFN664', 'IFN666'],
      },
    ],
  },
]

// ── Bachelor course structure ─────────────────────────────────────────────────

const BACH_CORE_Y1S1 = ['IFB102', 'IFB103', 'IFB104', 'IFB105']
const BACH_CORE_Y1S2 = ['IFB201', 'IFB220', 'IFB240']

type BachSpecSubGroups = { y2s1: string[]; y2s2: string[]; y3s1: string[]; y3s2: string[] }

const BACH_SPEC_UNITS: Partial<Record<string, BachSpecSubGroups>> = {
  'Artificial Intelligence': {
    y2s1: ['CAB201', 'IFB320'],
    y2s2: ['IAB353', 'CAB330', 'DSB102'],
    y3s1: ['IFB398', 'CAB420'],
    y3s2: ['IFB399'],
  },
  'Business Analysis and IT Management': {
    y2s1: ['IAB203', 'IAB204'],
    y2s2: ['IAB305', 'IAB353'],
    y3s1: ['IFB398', 'IAB402'],
    y3s2: ['IFB399', 'IAB401'],
  },
}

function buildBachelorStructure(major: string): Category[] {
  const spec = BACH_SPEC_UNITS[major]
  const cats: Category[] = [
    {
      label: 'Year 1 — Foundations',
      icon: '📚',
      subGroups: [
        { label: 'Semester 1', codes: BACH_CORE_Y1S1 },
        { label: 'Semester 2', codes: BACH_CORE_Y1S2 },
      ],
    },
  ]

  if (spec) {
    cats.push({
      label: `${major} Major`,
      icon: '🎓',
      subGroups: [
        { label: 'Year 2, Semester 1', codes: spec.y2s1 },
        { label: 'Year 2, Semester 2', codes: spec.y2s2 },
        { label: 'Year 3, Semester 1', codes: spec.y3s1 },
        { label: 'Year 3, Semester 2', codes: spec.y3s2 },
      ],
    })
  } else if (major) {
    cats.push({
      label: `${major} Major`,
      icon: '🎓',
      subGroups: [
        { label: 'Sequence coming soon', codes: [] },
      ],
    })
  }

  return cats
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function UnitProgress({ completedUnits, onToggle, degree, major }: Props) {
  const { units: allUnits, loading, error } = useUnits()
  const [query, setQuery] = useState('')

  // Index DB units by code for fast lookup
  const unitMap = useMemo(
    () => new Map(allUnits.map(u => [u.unit_code, u])),
    [allUnits],
  )

  const structure = degree === 'Master' ? MIT_STRUCTURE : buildBachelorStructure(major)

  // Collect all unique codes in the current structure
  const allCodes = useMemo(() => {
    const seen = new Set<string>()
    for (const cat of structure)
      for (const sg of cat.subGroups)
        for (const c of sg.codes)
          seen.add(c)
    return seen
  }, [structure])

  const totalKnown = allCodes.size
  const completedCount = [...allCodes].filter(c => completedUnits.has(c)).length
  const pct = totalKnown > 0 ? Math.round((completedCount / (degree === 'Master' ? 16 : 24)) * 100) : 0

  const q = query.trim().toLowerCase()

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-6 text-sm text-gray-400">
        <div className="w-4 h-4 border-2 border-blue-400 rounded-full border-t-transparent animate-spin" />
        Loading units…
      </div>
    )
  }
  if (error) {
    return <p className="py-4 text-sm text-red-600">Could not load units — is the backend running?</p>
  }

  return (
    <div className='space-y-4'>
      {/* ── Progress summary ──────────────────────────────── */}
      <div className='space-y-1.5'>
        <div className='flex items-center justify-between text-xs font-medium text-gray-600'>
          <span>
            {completedCount} / {degree === 'Master' ? 16 : 24} units completed
          </span>
        </div>
        <div className='h-2 overflow-hidden bg-gray-100 rounded-full'>
          <div
            className='h-full transition-all duration-500 rounded-full bg-emerald-500'
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* ── Search ────────────────────────────────────────── */}
      <div className='relative'>
        <svg
          className='absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none'
          fill='none'
          viewBox='0 0 24 24'
          stroke='currentColor'
          strokeWidth={2}
        >
          <path
            strokeLinecap='round'
            strokeLinejoin='round'
            d='M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z'
          />
        </svg>
        <input
          type='text'
          placeholder='Search by unit code or title…'
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className='w-full py-2 pl-8 pr-8 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 placeholder:text-gray-400'
        />
        {query && (
          <button
            onClick={() => setQuery('')}
            className='absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600'
          >
            <svg
              className='w-3.5 h-3.5'
              fill='none'
              viewBox='0 0 24 24'
              stroke='currentColor'
              strokeWidth={2.5}
            >
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                d='M6 18L18 6M6 6l12 12'
              />
            </svg>
          </button>
        )}
      </div>

      {/* ── Category tree ─────────────────────────────────── */}
      <div className='space-y-2'>
        {structure.map((cat) => (
          <CategoryBlock
            key={cat.label}
            category={cat}
            unitMap={unitMap}
            completedUnits={completedUnits}
            onToggle={onToggle}
            filterQuery={q}
          />
        ))}
      </div>
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Return a Unit object for a code — from DB if available, else from static titles. */
function resolveUnit(code: string, unitMap: Map<string, Unit>): Unit {
  return unitMap.get(code) ?? {
    unit_code: code,
    title: BACHELOR_UNIT_TITLES[code] ?? '',
    learning_outcomes: [],
    content: '',
    credit_points: '',
    pre_requisite: '',
    study_period: '',
    year: '',
  }
}

// ── Category (top-level) ──────────────────────────────────────────────────────

interface CategoryBlockProps {
  category: Category
  unitMap: Map<string, Unit>
  completedUnits: Set<string>
  onToggle: (code: string) => void
  filterQuery: string
}

function CategoryBlock({ category, unitMap, completedUnits, onToggle, filterQuery }: CategoryBlockProps) {
  const [open, setOpen] = useState(false)

  const allCodes = useMemo(() => {
    const seen = new Set<string>()
    for (const sg of category.subGroups)
      for (const c of sg.codes)
        seen.add(c)
    return seen
  }, [category])

  const completedInCat = [...allCodes].filter(c => completedUnits.has(c)).length
  const total = allCodes.size

  const anyMatch = filterQuery === '' || [...allCodes].some(c => {
    const u = resolveUnit(c, unitMap)
    return u.unit_code.toLowerCase().includes(filterQuery) ||
           u.title.toLowerCase().includes(filterQuery)
  })
  if (!anyMatch) return null

  const isOpen = open || filterQuery !== ''

  return (
    <div className="overflow-hidden border border-gray-200 rounded-xl">
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center justify-between w-full px-4 py-3 text-left transition-colors bg-gray-50 hover:bg-gray-100"
      >
        <div className="flex items-center gap-2">
          <span className="text-base">{category.icon}</span>
          <span className="text-sm font-semibold text-gray-800">{category.label}</span>
          <span className="text-xs font-normal text-gray-400">· {total} units</span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full
            ${completedInCat === total && total > 0
              ? 'text-emerald-700 bg-emerald-50 border border-emerald-200'
              : 'text-gray-500 bg-white border border-gray-200'}`}>
            {completedInCat}/{total}
          </span>
          <svg
            className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {isOpen && (
        <div className="bg-white divide-y divide-gray-100">
          {category.subGroups.map(sg => (
            <SubGroupBlock
              key={sg.label}
              subGroup={sg}
              unitMap={unitMap}
              completedUnits={completedUnits}
              onToggle={onToggle}
              filterQuery={filterQuery}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ── Sub-group ─────────────────────────────────────────────────────────────────

interface SubGroupBlockProps {
  subGroup: SubGroup
  unitMap: Map<string, Unit>
  completedUnits: Set<string>
  onToggle: (code: string) => void
  filterQuery: string
}

function SubGroupBlock({ subGroup, unitMap, completedUnits, onToggle, filterQuery }: SubGroupBlockProps) {
  const [open, setOpen] = useState(false)

  if (subGroup.codes.length === 0) {
    return (
      <div className="px-5 py-3 text-xs italic text-gray-400">
        {subGroup.label}
      </div>
    )
  }

  // Resolve all units — DB data if available, static title as fallback
  const units = subGroup.codes.map(c => resolveUnit(c, unitMap))

  const visible = filterQuery
    ? units.filter(u =>
        u.unit_code.toLowerCase().includes(filterQuery) ||
        u.title.toLowerCase().includes(filterQuery))
    : units

  if (visible.length === 0) return null

  const completedHere = visible.filter(u => completedUnits.has(u.unit_code)).length
  const allDone = completedHere === visible.length && visible.length > 0
  const isOpen = open || filterQuery !== ''

  return (
    <div>
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-5 py-2.5
                   hover:bg-gray-50 transition-colors text-left"
      >
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-300 shrink-0" />
          <span className="text-xs font-medium text-gray-700">{subGroup.label}</span>
          {allDone && (
            <span className="text-[10px] font-medium text-emerald-600 bg-emerald-50
                             border border-emerald-200 px-1.5 py-0.5 rounded-full">
              ✓ Done
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-400 shrink-0">
          <span>{completedHere}/{visible.length}</span>
          <svg
            className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-180' : ''}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {isOpen && (
        <ul className="ml-5 border-l border-gray-100">
          {visible.map(unit => {
            const done = completedUnits.has(unit.unit_code)
            return (
              <li key={unit.unit_code}>
                <button
                  onClick={() => onToggle(unit.unit_code)}
                  className={`w-full flex items-center gap-3 pl-4 pr-5 py-2 text-left
                             hover:bg-gray-50 transition-colors group
                             ${done ? 'bg-emerald-50/30' : 'bg-white'}`}
                >
                  <span className={`shrink-0 w-3.5 h-3.5 rounded border-2 flex items-center
                                   justify-center transition-colors
                                   ${done
                                     ? 'border-emerald-500 bg-emerald-500'
                                     : 'border-gray-300 group-hover:border-emerald-400'}`}>
                    {done && (
                      <svg className="w-2 h-2 text-white" fill="none"
                           viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </span>
                  <span className={`shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded
                                   ${done ? 'bg-emerald-100 text-emerald-600' : 'bg-blue-50 text-blue-600'}`}>
                    {unit.unit_code}
                  </span>
                  <span className={`text-xs truncate leading-snug
                                   ${done ? 'text-gray-400 line-through' : 'text-gray-700'}`}>
                    {unit.title || unit.unit_code}
                  </span>
                  {unit.credit_points && (
                    <span className="ml-auto shrink-0 text-[10px] text-gray-400">
                      {unit.credit_points}cp
                    </span>
                  )}
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
