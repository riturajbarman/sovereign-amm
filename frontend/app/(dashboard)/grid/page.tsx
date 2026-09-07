'use client';
import dynamic from 'next/dynamic';
import { Panel } from '@/components/ui/Panel';
import { LockOverlay } from '@/components/layout/LockOverlay';
import { LmpPanel } from '@/components/panels/LmpPanel';
import { GRID_DATA } from '@/lib/mock/grid';

const GridTopologySVG = dynamic(
  () => import('@/components/charts/GridTopologySVG').then((m) => m.GridTopologySVG),
  { ssr: false },
);

function PtdfMatrix() {
  const { ptdf, lines, buses } = GRID_DATA;
  return (
    <div className="p-4 overflow-auto max-h-56">
      <p className="text-xs uppercase tracking-widest text-slate-400 font-mono mb-3">
        PTDF Matrix [{lines.length} × {buses.length}]
      </p>
      <table className="text-xs font-mono border-collapse">
        <thead>
          <tr>
            <th className="pr-2 text-slate-500 font-normal text-left">LINE</th>
            {buses.map((b) => (
              <th key={b.id} className="px-2 text-slate-500 font-normal">
                {b.id.replace('BUS-', '')}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {ptdf.map((row, i) => (
            <tr key={i}>
              <td className="pr-2 text-slate-400">{lines[i]?.id ?? `L${i}`}</td>
              {row.map((v, j) => (
                <td
                  key={j}
                  className={`px-2 tabular-nums text-right ${
                    Math.abs(v) > 0.2 ? 'text-amber-400' : 'text-slate-400'
                  }`}
                >
                  {v.toFixed(2)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function GridPage() {
  return (
    <>
      <div className="bg-gradient-to-b from-slate-900 to-transparent border-b border-slate-800 py-12 px-4">
        <div className="max-w-7xl mx-auto text-center">
          <p className="text-xs uppercase tracking-widest text-emerald-400 font-mono mb-2">
            PTDF · DC Power Flow
          </p>
          <h1 className="text-3xl sm:text-4xl font-bold text-white">
            Physical Physics, Meet Financial Markets.
          </h1>
          <p className="text-slate-400 mt-3 max-w-xl mx-auto text-sm">
            7-bus campus microgrid with PTDF screening. O(L) congestion checks before every trade.
          </p>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-4">
        <Panel className="p-4">
          <h2 className="text-xs uppercase tracking-widest text-slate-400 mb-3 font-mono">
            Live Topology
          </h2>
          <GridTopologySVG interactive />
        </Panel>

        <div className="grid md:grid-cols-2 gap-4">
          <Panel>
            <LockOverlay
              title="Unlock Congestion Data"
              body="Create a free account to view live LMP and congestion pricing."
              ctaLabel="Sign Up Now"
            >
              <LmpPanel />
            </LockOverlay>
          </Panel>
          <Panel>
            <LockOverlay
              title="Unlock PTDF Matrix"
              body="Create a free account to view live transmission sensitivity data."
              ctaLabel="Sign Up Now"
            >
              <PtdfMatrix />
            </LockOverlay>
          </Panel>
        </div>
      </main>
    </>
  );
}
