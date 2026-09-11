'use client';

import { useStore } from '@/lib/store';
import { Badge } from '@/components/ui/Badge';

// ---------------------------------------------------------------------------
// LmpPanel
// ---------------------------------------------------------------------------

/**
 * Per-bus Locational Marginal Price table, sorted by LMP descending.
 *
 * Columns:
 *   RANK  - position in the descending LMP sort
 *   BUS   - bus identifier (e.g. BUS-05)
 *   LMP   - price in ₹/kWh (sky-400 for visibility)
 *   INJ   - net injection in MW (emerald if ≥ 0, rose if negative)
 *   STATUS - amber CONGESTED badge when the bus has an active congestion flag,
 *            em-dash otherwise
 *
 * Congestion is determined by `congestionFlags[bus.id]` from the grid slice.
 * Note: `congestionFlags` is keyed by line ID in the store, but buses share
 * IDs with lines only when there is a same-named line. The LmpPanel renders
 * the flag per bus.id, which may be absent (→ false → em-dash).
 */
export function LmpPanel() {
  const { buses, congestionFlags } = useStore((s) => ({
    buses:           s.buses,
    congestionFlags: s.congestionFlags,
  }));

  const sorted = [...buses].sort((a, b) => b.lmp - a.lmp);

  return (
    <div className="flex flex-col gap-2">
      <h2 className="text-xs uppercase tracking-widest text-slate-400 font-sans">
        LMP Shadow Costs
      </h2>
      <table className="w-full text-xs font-mono">
        <thead>
          <tr className="text-slate-500 border-b border-slate-800">
            <th className="py-1 text-left font-normal">RANK</th>
            <th className="py-1 text-left font-normal">BUS</th>
            <th className="py-1 text-right font-normal">LMP (₹/kWh)</th>
            <th className="py-1 text-right font-normal">INJ (MW)</th>
            <th className="py-1 text-left font-normal pl-3">STATUS</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((bus, i) => (
            <tr key={bus.id} className="border-b border-slate-800/50">
              <td className="py-1 text-slate-500 tabular-nums">{i + 1}</td>
              <td className="py-1 text-slate-200">{bus.id}</td>
              <td className="py-1 text-right tabular-nums text-sky-400">
                {bus.lmp.toFixed(3)}
              </td>
              <td
                className={`py-1 text-right tabular-nums ${
                  bus.injectionMW >= 0 ? 'text-emerald-400' : 'text-rose-500'
                }`}
              >
                {bus.injectionMW >= 0 ? '+' : ''}
                {bus.injectionMW.toFixed(2)}
              </td>
              <td className="py-1 pl-3">
                {congestionFlags[bus.id] ? (
                  <Badge color="amber">CONGESTED</Badge>
                ) : (
                  <span className="text-slate-500">—</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default LmpPanel;
