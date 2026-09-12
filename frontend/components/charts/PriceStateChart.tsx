'use client';

import { useMemo, useEffect, useState } from 'react';
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
import { useTheme } from 'next-themes';

interface TooltipProps {
  active?: boolean;
  payload?: { color: string; name: string; value: number }[];
  label?: number;
}

function ThemeAwareTooltip({ active, payload, label }: TooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white/90 dark:bg-slate-800 border border-sky-200 dark:border-slate-700 rounded-lg p-2 font-mono text-xs text-slate-900 dark:text-slate-200 shadow-sm dark:shadow-none">
      <div className="text-slate-500 dark:text-slate-400 mb-1">t={label}</div>
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
  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isLight = mounted && theme === 'light';

  const filtered = useMemo(() => {
    if (range === 'ALL') return timeseries;
    const pts =
      range === '1H' ? 600 : range === '4H' ? 2400 : 14400;
    return timeseries.slice(-pts);
  }, [timeseries, range]);

  const gridColor = isLight ? "#e0f2fe" : "#1e293b"; // sky-100 vs slate-800
  const tickColor = isLight ? "#64748b" : "#94a3b8"; // slate-500 vs slate-400
  const refAreaColor = isLight ? "rgba(16,185,129,0.15)" : "rgba(16,185,129,0.08)";
  const priceColor = isLight ? "#0ea5e9" : "#38bdf8"; // sky-500 vs sky-400
  const socColor = isLight ? "#059669" : "#10b981"; // emerald-600 vs emerald-500

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart
        data={filtered}
        margin={{ top: 8, right: 16, bottom: 8, left: 16 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
        <XAxis dataKey="t" hide />
        <YAxis
          yAxisId="price"
          orientation="left"
          stroke={priceColor}
          tick={{ fill: tickColor, fontFamily: 'monospace', fontSize: 10 }}
          domain={['auto', 'auto']}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          yAxisId="soc"
          orientation="right"
          stroke={socColor}
          tick={{ fill: tickColor, fontFamily: 'monospace', fontSize: 10 }}
          domain={[0, 100]}
          tickLine={false}
          axisLine={false}
        />
        <ReferenceArea
          yAxisId="soc"
          y1={30}
          y2={80}
          fill={refAreaColor}
        />
        <Tooltip content={<ThemeAwareTooltip />} />
        <Legend
          wrapperStyle={{
            fontFamily: 'monospace',
            fontSize: 11,
            color: tickColor,
          }}
        />
        <Line
          yAxisId="price"
          type="monotone"
          dataKey="price"
          stroke={priceColor}
          strokeWidth={2}
          dot={false}
          isAnimationActive={false}
          name="micro-price"
        />
        <Line
          yAxisId="soc"
          type="monotone"
          dataKey="soc"
          stroke={socColor}
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
