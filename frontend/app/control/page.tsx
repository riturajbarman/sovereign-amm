'use client';

import dynamic from 'next/dynamic';
import { Panel } from '@/components/ui/Panel';
import { LmpPanel } from '@/components/panels/LmpPanel';
import { InjectionOverride } from '@/components/panels/InjectionOverride';

const GridTopologySVG = dynamic(
  () =>
    import('@/components/charts/GridTopologySVG').then(
      (m) => m.GridTopologySVG,
    ),
  { ssr: false },
);

/**
 * /control — Grid Control Terminal page.
 *
 * Interactive PTDF topology page: a hand-built SVG 7-bus microgrid map with
 * animated dashed flow lines, bus hover tooltips, and a Node Injection
 * Override panel. Injecting a load spike propagates PTDF-derived line-flow
 * changes within 1 second; the injection auto-decays after 8 seconds.
 * An LMP shadow-costs table spans the full width below.
 *
 * Requirements: 25.1, 25.2, 25.3, 25.4, 25.5, 25.6, 25.7
 */
export default function ControlPage() {
  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div>
        <p className="text-xs uppercase tracking-widest text-slate-500 font-mono">
          PTDF TOPOLOGY
        </p>
        <h1 className="text-2xl font-bold text-white">Grid Control Terminal</h1>
        <p className="text-sm text-slate-400 mt-1">
          INJECT LOAD SPIKE to observe PTDF-propagated reactions within 1
          second.
        </p>
      </div>

      {/* ── Topology map + injection override ───────────────────────────── */}
      <div className="grid lg:grid-cols-[2fr_1fr] gap-4">
        <Panel className="p-4">
          <h2 className="text-xs uppercase tracking-widest text-slate-400 mb-3 font-mono">
            7-Bus Microgrid
          </h2>
          <GridTopologySVG interactive />
        </Panel>

        <Panel className="p-4">
          <InjectionOverride />
        </Panel>
      </div>

      {/* ── LMP shadow costs table ───────────────────────────────────────── */}
      <Panel className="p-4">
        <LmpPanel />
      </Panel>
    </main>
  );
}
