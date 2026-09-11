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
  Cell,
  ReferenceLine,
} from 'recharts';
import { useStore } from '@/lib/store';
import { formatPrice } from '@/lib/utils';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface DepthRow {
  price: string;
  priceNum: number;
  bidVol: number;
  askVol: number;
}

// ---------------------------------------------------------------------------
// DepthChart
// ---------------------------------------------------------------------------

/**
 * L2 Order Book Depth diverging bar chart.
 *
 * Bids extend left (negative x, emerald) and asks extend right (positive x,
 * rose). The zero reference line marks the mid. Data is sourced directly from
 * the live Zustand `book` slice so the chart has real data on first paint.
 *
 * Rendering is deliberately non-animated (`isAnimationActive={false}`) to
 * keep the 10 Hz tick rate responsive.
 */
export function DepthChart() {
  const book = useStore((s) => s.book);

  const chartData = useMemo<DepthRow[]>(() => {
    const rows: DepthRow[] = [];

    for (const level of book.bids) {
      rows.push({
        price: formatPrice(level.px, 3),
        priceNum: level.px,
        bidVol: -level.sz,
        askVol: 0,
      });
    }

    for (const level of book.asks) {
      rows.push({
        price: formatPrice(level.px, 3),
        priceNum: level.px,
        bidVol: 0,
        askVol: level.sz,
      });
    }

    // Descending price order — highest ask at top, lowest bid at bottom.
    return rows.sort((a, b) => b.priceNum - a.priceNum);
  }, [book]);

  return (
    <ResponsiveContainer width="100%" height={320}>
      <BarChart
        layout="vertical"
        data={chartData}
        margin={{ top: 8, right: 16, bottom: 8, left: 72 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
        <XAxis
          type="number"
          tick={{ fill: '#94a3b8', fontFamily: 'monospace', fontSize: 11 }}
          tickLine={{ stroke: '#334155' }}
          axisLine={{ stroke: '#334155' }}
          tickFormatter={(v: number) => Math.abs(v).toFixed(1)}
        />
        <YAxis
          dataKey="price"
          type="category"
          width={72}
          tick={{ fill: '#94a3b8', fontFamily: 'monospace', fontSize: 10 }}
          tickLine={{ stroke: '#334155' }}
          axisLine={{ stroke: '#334155' }}
        />
        <ReferenceLine x={0} stroke="#475569" strokeWidth={1} />
        <Tooltip
          cursor={{ fill: 'rgba(100,116,139,0.1)' }}
          contentStyle={{
            backgroundColor: '#1e293b',
            border: '1px solid #334155',
            borderRadius: 6,
            fontFamily: 'monospace',
            fontSize: 11,
            color: '#e2e8f0',
          }}
          formatter={(v: number, name: string) => [
            Math.abs(v).toFixed(2) + ' kWh',
            name === 'bidVol' ? 'Bid' : 'Ask',
          ]}
        />
        <Bar dataKey="bidVol" isAnimationActive={false} fill="#10b981" radius={[0, 2, 2, 0]}>
          {chartData.map((_, i) => (
            <Cell key={i} fill="#10b981" />
          ))}
        </Bar>
        <Bar dataKey="askVol" isAnimationActive={false} fill="#e11d48" radius={[0, 2, 2, 0]}>
          {chartData.map((_, i) => (
            <Cell key={i} fill="#e11d48" />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export default DepthChart;
