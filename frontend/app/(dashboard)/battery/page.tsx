/**
 * Battery Page — authenticated battery monitoring view.
 *
 * Expanded State-of-Charge visualisation, Rainflow cycle fatigue cost
 * tracking, and degradation metrics derived from the live WebSocket stream.
 *
 * Protected by the parent (dashboard)/layout.tsx auth guard.
 *
 * Requirements: 2.3, 11.1–11.7
 */
export default function BatteryPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="max-w-7xl mx-auto px-4 py-12">
        {/* Page header */}
        <header className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Battery Monitoring</h1>
          <p className="mt-2 text-slate-400 text-base max-w-2xl">
            Live State-of-Charge tracking with Rainflow cycle fatigue cost,
            degradation cost per kWh, and historical SoC trend chart.
          </p>
        </header>

        {/* Placeholder canvas — replaced by expanded BatteryGauge + SoC chart */}
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
                  d="M21 10.5h.375c.621 0 1.125.504 1.125 1.125v2.25c0 .621-.504 1.125-1.125 1.125H21M3.75 18h15A2.25 2.25 0 0021 15.75v-6a2.25 2.25 0 00-2.25-2.25h-15A2.25 2.25 0 001.5 9.75v6A2.25 2.25 0 003.75 18z"
                />
              </svg>
            </div>
            <p className="text-slate-400 text-sm font-medium">
              Expanded battery monitoring coming soon
            </p>
            <p className="text-slate-600 text-xs max-w-xs">
              Full-page Battery Gauge, SoC history chart, and Rainflow wear
              metrics will render here.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
