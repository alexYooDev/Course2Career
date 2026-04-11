import UnitList from './components/UnitList'

export default function App() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* ── Nav ─────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-10 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-6xl mx-auto px-6 py-3 flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shrink-0">
            <span className="text-white font-bold text-sm">C2</span>
          </div>
          <div>
            <h1 className="text-base font-semibold text-gray-900 leading-none">
              Course2Career
            </h1>
            <p className="text-[11px] text-gray-400 mt-0.5">QUT IT Career Path Advisor</p>
          </div>
        </div>
      </header>

      {/* ── Main ────────────────────────────────────────────────── */}
      <main className="max-w-6xl mx-auto px-6 py-8">
        <UnitList />
      </main>
    </div>
  )
}
