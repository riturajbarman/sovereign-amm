'use client';

import { useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { useStore } from '@/lib/store';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface BoundaryPoint {
  soc: number;
  bid: number;
  ask: number;
}

// ---------------------------------------------------------------------------
// InventoryBoundaryChart
// ---------------------------------------------------------------------------

/**
 * GLFT bid/ask boundary curves plotted against State of Charge.
 *
 * Implements the GLFT asymptotic quote formulas from the AGENTS.md math
 * contract, sweeping SoC ∈ [18, 92] % → q ∈ [−1, +1]:
 *
 *   q         = 2 × (soc / 100) − 1
 *   base      = (1/k) × ln(1 + k/γ)
 *   spread    = sqrt( σ²γ / (2kA) × (1 + γ/k)^(1 + k/γ) )
 *   δ_bid(q)  = base + ((2q + 1) / 2) × spread
 *   δ_ask(q)  = base − ((2q − 1) / 2) × spread
 *   bid       = mid − δ_bid(q)
 *   ask       = mid + δ_ask(q) + C_deg
 *
 * Fixed parameters: k = 1.5 (order-flow decay), A = 1.0 (arrival intensity).
 * A vertical reference line marks the current live SoC position.
 *
 * @param sigma  - σ, volatility (from judge slice)
 * @param gamma  - γ, risk aversion (from judge slice)
 * @param cDeg   - C_deg, marginal wear cost (from battery slice)
 * @param soc    - Current SoC in % (from battery slice)
 * @param microPrice - Reference mid-price (from market slice)
 */
export function InventoryBoundaryChart() {
  const { soc, volatility, riskAversion, cDeg, microPrice } = useStore((s) => ({
    soc:          s.soc,
    volatility:   s.volatility,
    riskAversion: s.riskAversion,
    cDeg:         s.cDeg,
    microPrice:   s.microPrice,
  }));

  const data = useMemo<BoundaryPoint[]>(() => {
    const sigma = volatility;
    const gamma = riskAversion;
    const k     = 1.5;
    const A     = 1.0;

    const base   = (1 / k) * Math.log(1 + k / gamma);
    const spread = Math.sqrt(
      ((sigma * sigma * gamma) / (2 * k * A)) *
        Math.pow(1 + gamma / k, 1 + k / gamma),
    );

    return Array.from<unknown, BoundaryPoint>({ length: 50 }, (_, i) => {
      const s    = 18 + i * (74 / 49);
      const q    = 2 * (s / 100) - 1;
      const dBid = base + ((2 * q + 1) / 2) * spread;
      const dAsk = base - ((2 * q - 1) / 2) * spread;
      return {
        soc: +s.toFixed(1),
        bid: +(microPrice - dBid).toFixed(4),
        ask: +(microPrice + dAsk + cDeg).toFixed(4),
      };
    });
  }, [volatility, riskAversion, cDeg, microPrice]);

  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={data} margin={{ top: 8, right: 8, bottom: 8, left: 16 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
        <XAxis
          dataKey="soc"
          tick={{ fill: '#94a3b8', fontFamily: 'monospace', fontSize: 9 }}
          unit="%"
        />
        <YAxis
          tick={{ fill: '#94a3b8', fontFamily: 'monospace', fontSize: 9 }}
          domain={['auto', 'auto']}
        />
        <ReferenceLine
          x={+soc.toFixed(1)}
          stroke="#94a3b8"
          strokeDasharray="4 2"
          label={{ value: 'q', fill: '#94a3b8', fontSize: 9 }}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: '#1e293b',
            border: '1px solid #334155',
            fontFamily: 'monospace',
            fontSize: 10,
          }}
        />
        <Line
          type="monotone"
          dataKey="bid"
          stroke="#10b981"
          strokeWidth={1.5}
          dot={false}
          isAnimationActive={false}
          name="Bid"
        />
        <Line
          type="monotone"
          dataKey="ask"
          stroke="#e11d48"
          strokeWidth={1.5}
          dot={false}
          isAnimationActive={false}
          name="Ask"
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

export default InventoryBoundaryChart;
