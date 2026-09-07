'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { useStore } from '@/lib/store';
import { Panel } from '@/components/ui/Panel';
import { ParameterCard } from '@/components/panels/ParameterCard';
import { csvDownload } from '@/lib/utils';

const PriceStateChart = dynamic(
  () =>
    import('@/components/charts/PriceStateChart').then(
      (m) => m.PriceStateChart,
    ),
  { ssr: false },
);

/** Range selector options for the timeseries chart. */
type Range = '1H' | '4H' | '24H' | 'ALL';
const RANGES: Range[] = ['1H', '4H', '24H', 'ALL'];

/**
 * /price — Price & State History page.
 *
 * Renders a dual-axis Recharts line chart (micro-price left / SoC right),
 * a range selector, three ParameterCards for σ, γ, and C_deg each with a
 * 30-point sparkline, and a CSV export button.
 *
 * Requirements: 24.1, 24.2, 24.3, 24.4, 24.5, 24.6, 24.7
 */
export default function PricePage() {
  const [range, setRange] = useState<Range>('ALL');

  const { timeseries, microPrice, volatility, cDeg } = useStore((s) => ({
    timeseries: s.timeseries,
    microPrice: s.microPrice,
    volatility: s.volatility,
    cDeg: s.cDeg,
  }));

  // ── Sparkline data (last 30 points) ───────────────────────────────────────
  const priceSparkline = timeseries.slice(-30).map((p) => ({ v: p.price }));
  const sigmaSparkline = timeseries.slice(-30).map((p) => ({ v: p.soc / 100 }));
  const cDegSparkline = timeseries.slice(-30).map((p) => ({ v: p.cDeg }));

  // ── Delta vs previous tick ─────────────────────────────────────────────────
  const prevPoint = timeseries[timeseries.length - 2];
  const prevPrice = prevPoint?.price ?? microPrice;
  const prevCDeg = prevPoint?.cDeg ?? cDeg;

  // ── CSV export ─────────────────────────────────────────────────────────────
  const handleExport = () => {
    const header: string[] = ['timestamp', 'price', 'soc', 'cDeg'];
    const rows: string[][] = timeseries.map((p) => [
      String(p.t),
      p.price.toFixed(6),
      p.soc.toFixed(4),
      p.cDeg.toFixed(6),
    ]);
    csvDownload([header, ...rows], `sovereign-amm-ticks-${Date.now()}.csv`);
  };

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <p className="text-xs uppercase tracking-widest text-slate-500 font-mono">
            HISTORY
          </p>
          <h1 className="text-2xl font-bold text-white">
            Price &amp; State History
          </h1>
        </div>

        <div className="flex items-center gap-2">
          {/* Range selector */}
          <div className="flex items-center gap-1 bg-slate-800 rounded-lg p-1">
            {RANGES.map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={`px-3 py-1 text-xs font-mono rounded-md transition-colors ${
                  range === r
                    ? 'bg-emerald-600 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {r}
              </button>
            ))}
          </div>

          {/* CSV export */}
          <button
            onClick={handleExport}
            className="px-3 py-2 text-xs font-mono bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700 transition-colors"
          >
            Export Tick Data (CSV)
          </button>
        </div>
      </div>

      {/* ── Main chart ──────────────────────────────────────────────────── */}
      <Panel className="p-4">
        <PriceStateChart range={range} />
      </Panel>

      {/* ── Parameter cards ─────────────────────────────────────────────── */}
      <div className="grid sm:grid-cols-3 gap-4">
        <ParameterCard
          label="VOLATILITY σ"
          value={volatility}
          delta={volatility - 0.06}
          sparklineData={sigmaSparkline}
          color="#38bdf8"
        />
        <ParameterCard
          label="MICRO PRICE"
          value={microPrice}
          delta={microPrice - prevPrice}
          sparklineData={priceSparkline}
          color="#38bdf8"
          unit="₹/kWh"
        />
        <ParameterCard
          label="C_deg"
          value={cDeg}
          delta={cDeg - prevCDeg}
          sparklineData={cDegSparkline}
          color="#f59e0b"
          unit="₹/kWh"
        />
      </div>
    </main>
  );
}
