import type { RecommendationResponse, StudyResource, Unit } from '../types'
import UnitCard from './UnitCard'

/** Render **bold** markdown as <strong> spans, everything else as plain text. */
function Bold({ text }: { text: string }) {
  const parts = text.split(/\*\*(.+?)\*\*/g)
  return (
    <>
      {parts.map((part, i) =>
        i % 2 === 1
          ? <strong key={i} className="font-semibold text-gray-900">{part}</strong>
          : <span key={i}>{part}</span>
      )}
    </>
  )
}

interface Props {
  recommendations: RecommendationResponse
  completedUnits: Set<string>
  onToggle: (code: string) => void
}

function toUnit(rec: RecommendationResponse['recommendations'][number]): Unit {
  return {
    unit_code: rec.unit_code,
    title: rec.title,
    content: rec.matching_reason,
    learning_outcomes: [],
    credit_points: '',
    pre_requisite: '',
    study_period: '',
    year: '',
  }
}

// Icon + colour config per resource type
const RESOURCE_CONFIG: Record<
  StudyResource['type'],
  { label: string; bg: string; text: string; icon: string }
> = {
  course:    { label: 'Course',    bg: 'bg-violet-50',  text: 'text-violet-700', icon: '🎓' },
  youtube:   { label: 'YouTube',   bg: 'bg-red-50',     text: 'text-red-700',    icon: '▶️' },
  podcast:   { label: 'Podcast',   bg: 'bg-amber-50',   text: 'text-amber-700',  icon: '🎙️' },
  community: { label: 'Community', bg: 'bg-teal-50',    text: 'text-teal-700',   icon: '👥' },
  event:     { label: 'Event',     bg: 'bg-sky-50',     text: 'text-sky-700',    icon: '📅' },
}

export default function RecommendationPanel({ recommendations, completedUnits, onToggle }: Props) {
  const {
    job_title,
    gap_analysis,
    next_semester_plan,
    study_resources,
    recommendations: results,
    total_units_analyzed,
  } = recommendations

  return (
    <section className="space-y-5">
      {/* ── Heading ──────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-base font-semibold text-gray-900">Recommendations</h2>
          {total_units_analyzed > 0 && (
            <p className="text-sm text-gray-500 mt-0.5">
              Analysed {total_units_analyzed} unit{total_units_analyzed !== 1 ? 's' : ''}
              {job_title ? ` for "${job_title}"` : ''}
            </p>
          )}
        </div>
        <div className="flex items-center gap-3 text-xs text-gray-500">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block" />High match
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block" />Moderate
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-gray-300 inline-block" />Lower
          </span>
        </div>
      </div>

      {/* ── 1. Gap Analysis ──────────────────────────────────────── */}
      <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-2">
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-blue-500 shrink-0" fill="none"
               viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round"
                  d="M13 16h-1v-4h-1m1-4h.01M12 2a10 10 0 100 20A10 10 0 0012 2z" />
          </svg>
          <h3 className="text-sm font-semibold text-gray-900">
            Gap Analysis
            {job_title && <span className="ml-1.5 font-normal text-gray-500">— {job_title}</span>}
          </h3>
        </div>
        <p className="text-sm text-gray-700 leading-relaxed"><Bold text={gap_analysis} /></p>
      </div>

      {/* ── 2. Recommended Units ─────────────────────────────────── */}
      {results.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-8 text-center">
          <p className="text-sm text-gray-500">No unit recommendations were returned.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {results.map(rec => (
            <UnitCard
              key={rec.unit_code}
              unit={toUnit(rec)}
              score={rec.score}
              isCompleted={completedUnits.has(rec.unit_code)}
              onToggle={onToggle}
              gapSkills={rec.gap_skills}
            />
          ))}
        </div>
      )}

      {/* ── 3. Next Semester Plan ─────────────────────────────────── */}
      {next_semester_plan && (
        <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-2">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-emerald-500 shrink-0" fill="none"
                 viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round"
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <h3 className="text-sm font-semibold text-gray-900">Next Semester Action Plan</h3>
          </div>
          <p className="text-sm text-gray-700 leading-relaxed"><Bold text={next_semester_plan} /></p>
        </div>
      )}

      {/* ── 4. Study Resources ───────────────────────────────────── */}
      {study_resources.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-gray-500 shrink-0" fill="none"
                 viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round"
                    d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            <h3 className="text-sm font-semibold text-gray-900">
              Additional Study Resources
            </h3>
            <span className="text-xs text-gray-400">— for gaps beyond the curriculum</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {study_resources.map((res, i) => {
              const cfg = RESOURCE_CONFIG[res.type] ?? RESOURCE_CONFIG.course
              return (
                <div
                  key={i}
                  className={`rounded-xl border border-gray-100 ${cfg.bg} p-4 space-y-1.5`}
                >
                  {/* Type badge + title */}
                  <div className="flex items-start gap-2">
                    <span className="text-base shrink-0">{cfg.icon}</span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className={`text-[10px] font-semibold uppercase tracking-wide ${cfg.text}`}>
                          {cfg.label}
                        </span>
                        <span className="text-[10px] text-gray-400">·</span>
                        <span className="text-[10px] text-gray-500">{res.provider}</span>
                      </div>
                      <div className="flex items-start justify-between gap-2 mt-0.5">
                        <p className="text-xs font-semibold text-gray-900 leading-snug">
                          {res.title}
                        </p>
                        {res.url && (
                          <a
                            href={res.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Open resource"
                            className={`shrink-0 inline-flex items-center gap-1 text-[10px] font-medium
                                       ${cfg.text} hover:underline`}
                          >
                            Visit
                            <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24"
                                 stroke="currentColor" strokeWidth={2.5}>
                              <path strokeLinecap="round" strokeLinejoin="round"
                                    d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4
                                       M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                  {/* Description */}
                  <p className="text-xs text-gray-600 leading-relaxed pl-7">
                    {res.description}
                  </p>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </section>
  )
}
