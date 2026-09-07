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
  ReferenceArea,
  Legend,
} from 'recharts';
import { useStore } from '@/lib/store';

interface DarkTooltipProps {
  active?: boolean;
  payload?: { color: string; name: string; value: number }[];
  label?: number;
}

function DarkTooltip({ active, payload, label }: DarkTooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-lg p-2 font-mono text-xs text-slate-200">
      <div className="text-slate-400 mb-1">t={label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color }}>
          {p.name}: {p.value.toFixed(4)}
        </div>
      ))}
    </div>
  );
}

interface PriceStateChartProps {
  range?: '1H' | '4H' | '24H' | 'ALL';
}

export function PriceStateChart({ range = 'ALL' }: PriceStateChartProps) {
  const timeseries = useStore((s) => s.timeseries);

  const filtered = useMemo(() => {
    if (range === 'ALL') return timeseries;
    const pts =
      range === '1H' ? 600 : range === '4H' ? 2400 : 14400;
    return timeseries.slice(-pts);
  }, [timeseries, range]);

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart
        data={filtered}
        margin={{ top: 8, right: 16, bottom: 8, left: 16 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
        <XAxis dataKey="t" hide />
        <YAxis
          yAxisId="price"
          orientation="left"
          stroke="#38bdf8"
          tick={{ fill: '#94a3b8', fontFamily: 'monospace', fontSize: 10 }}
          domain={['auto', 'auto']}
        />
        <YAxis
          yAxisId="soc"
          orientation="right"
          stroke="#10b981"
          tick={{ fill: '#94a3b8', fontFamily: 'monospace', fontSize: 10 }}
          domain={[0, 100]}
        />
        <ReferenceArea
          yAxisId="soc"
          y1={30}
          y2={80}
          fill="rgba(16,185,129,0.08)"
        />
        <Tooltip content={<DarkTooltip />} />
        <Legend
          wrapperStyle={{
            fontFamily: 'monospace',
            fontSize: 11,
            color: '#94a3b8',
          }}
        />
        <Line
          yAxisId="price"
          type="monotone"
          dataKey="price"
          stroke="#38bdf8"
          strokeWidth={2}
          dot={false}
          isAnimationActive={false}
          name="micro-price"
        />
        <Line
          yAxisId="soc"
          type="monotone"
          dataKey="soc"
          stroke="#10b981"
          strokeWidth={2}
          dot={false}
          isAnimationActive={false}
          name="SoC %"
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

export default PriceStateChart;
