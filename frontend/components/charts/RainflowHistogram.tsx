'use client';

import { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { useStore } from '@/lib/store';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Five depth-of-discharge bucket labels, each spanning 20 pp. */
const BUCKETS: string[] = ['0-20%', '20-40%', '40-60%', '60-80%', '80-100%'];

// ---------------------------------------------------------------------------
// RainflowHistogram
// ---------------------------------------------------------------------------

/**
 * Bar chart of rainflow depth-of-discharge (DoD) cycle counts.
 *
 * Only SoC reversals > 4 pp are counted as half-cycles; this mirrors the
 * streaming 3-point rainflow stack in `engine/core/degradation/rainflow_stream.py`.
 *
 * The delta between consecutive SoC points in the timeseries is used as a
 * proxy for DoD depth:
 *   d = |soc[i] − soc[i−1]| / 100
 *   bucket = floor(d × 5), clamped to [0, 4]
 *
 * Buckets map directly to BUCKETS labels (index 0 = 0–20 % DoD, etc.).
 */
export function RainflowHistogram() {
  const timeseries = useStore((s) => s.timeseries);

  const data = useMemo(() => {
    const counts = [0, 0, 0, 0, 0];
    for (let i = 1; i < timeseries.length; i++) {
      const delta = Math.abs(timeseries[i].soc - timeseries[i - 1].soc);
      if (delta > 4) {
        const d      = delta / 100;
        const bucket = Math.min(4, Math.floor(d * 5));
        counts[bucket]++;
      }
    }
    return BUCKETS.map((label, i) => ({ label, count: counts[i] }));
  }, [timeseries]);

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
        <XAxis
          dataKey="label"
          tick={{ fill: '#94a3b8', fontFamily: 'monospace', fontSize: 10 }}
        />
        <YAxis
          tick={{ fill: '#94a3b8', fontFamily: 'monospace', fontSize: 10 }}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: '#1e293b',
            border: '1px solid #334155',
            fontFamily: 'monospace',
            fontSize: 11,
            color: '#e2e8f0',
          }}
        />
        <Bar
          dataKey="count"
          fill="#f59e0b"
          isAnimationActive={false}
          radius={[2, 2, 0, 0]}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}

export default RainflowHistogram;
