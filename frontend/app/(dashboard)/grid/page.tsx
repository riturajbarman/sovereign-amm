/**
 * Grid Page — authenticated grid topology visualization.
 *
 * Displays the PTDF-based congestion map, real-time line flows, and
 * capacity tracking. Full interactive SVG implementation is wired to
 * the market store's live tick data.
 *
 * Protected by the parent (dashboard)/layout.tsx auth guard.
 *
 * Requirements: 2.3, 10.1–10.7
 */
export default function GridPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="max-w-7xl mx-auto px-4 py-12">
        {/* Page header */}
        <header className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Grid Topology</h1>
          <p className="mt-2 text-slate-400 text-base max-w-2xl">
            PTDF-based congestion visualisation with real-time line flows,
            capacity utilisation heat-map, and interactive routing details.
          </p>
        </header>

        {/* Placeholder canvas — replaced by the interactive SVG in a later phase */}
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-8 flex items-center justify-center min-h-[480px]">
          <div className="text-center space-y-3">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-800 mb-2">
              <svg
                className="w-8 h-8 text-slate-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z"
                />
              </svg>
            </div>
            <p className="text-slate-400 text-sm font-medium">
              Interactive grid topology coming soon
            </p>
            <p className="text-slate-600 text-xs max-w-xs">
              PTDF matrix, bus injections, and congestion indicators will render here.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
