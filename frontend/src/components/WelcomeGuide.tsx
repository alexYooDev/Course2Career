/**
 * WelcomeGuide — shown between JobSearch and the progress section
 * when the user has not yet run a recommendation.
 *
 * Walks through the three-step flow with visual cues and quick actions.
 */

const STEPS = [
  {
    num: '1',
    color: 'bg-blue-600',
    title: 'Set your profile & mark completed units',
    body: 'Select your degree, study period, and major in the "Your Progress" section below. Units will be auto-filled — review and adjust as needed.',
    action: null as string | null,
  },
  {
    num: '2',
    color: 'bg-violet-600',
    title: 'Find a job or paste a JD',
    body: 'Use the search bar above to look up real job listings from Adzuna, or switch to the "Paste JD" tab to drop in any job description.',
    action: null,
  },
  {
    num: '3',
    color: 'bg-emerald-600',
    title: 'Get your personalised plan',
    body: 'Click "Get Recommendations" to see matched QUT units, a skill gap analysis, a next-semester enrolment plan, and curated study resources.',
    action: null,
  },
]

export default function WelcomeGuide() {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden shadow-sm">
      {/* ── Header ───────────────────────────────────────── */}
      <div className="bg-blue-600 px-6 py-5">
        <div className="flex items-center gap-3">
          <div>
            <h2 className="text-white font-semibold text-base leading-none">
              Welcome to Course2Career
            </h2>
            <p className="text-blue-100 text-xs mt-1">
              Bridge the gap between your QUT IT degree and the job you want — in three steps.
            </p>
          </div>
        </div>
      </div>

      {/* ── Steps ────────────────────────────────────────── */}
      <div className="divide-y divide-gray-100">
        {STEPS.map((step, i) => (
          <div key={i} className="flex gap-4 px-6 py-4 hover:bg-gray-50/60 transition-colors">
            {/* Number bubble */}
            <div className={`shrink-0 w-7 h-7 rounded flex items-center
                            justify-center text-black text-xs font-bold mt-0.5`}>
              {step.num}
            </div>

            {/* Text */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900">{step.title}</p>
              <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{step.body}</p>

            </div>

            {/* Connector arrow between steps (not last) */}
            {i < STEPS.length - 1 && (
              <div className="shrink-0 self-center text-gray-300">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24"
                     stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* ── Tip footer ───────────────────────────────────── */}
      <div className="px-6 py-3 bg-amber-50 border-t border-amber-100 flex items-start gap-2">
        <span className="text-amber-500 text-sm shrink-0 mt-px">💡</span>
        <p className="text-xs text-amber-800 leading-relaxed">
          <span className="font-medium">Tip:</span> The more completed units you mark, the more
          tailored your recommendations become — the advisor will prioritise units you still need.
        </p>
      </div>
    </div>
  )
}
