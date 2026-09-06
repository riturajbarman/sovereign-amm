'use client';
import { useRef, useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { useStore } from '@/lib/store';
import { Panel } from '@/components/ui/Panel';
import { LockOverlay } from '@/components/layout/LockOverlay';

const BatteryGauge = dynamic(
  () => import('@/components/charts/BatteryGauge').then((m) => m.BatteryGauge),
  { ssr: false },
);
const RainflowHistogram = dynamic(
  () => import('@/components/charts/RainflowHistogram').then((m) => m.RainflowHistogram),
  { ssr: false },
);
const InventoryBoundaryChart = dynamic(
  () => import('@/components/charts/InventoryBoundaryChart').then((m) => m.InventoryBoundaryChart),
  { ssr: false },
);

function PnlMetrics() {
  return (
    <div className="p-4 h-32">
      <p className="text-xs uppercase tracking-widest text-slate-400 font-mono mb-2">PnL Metrics</p>
      <div className="grid grid-cols-2 gap-3 font-mono text-sm">
        <div><p className="text-xs text-slate-500">Daily PnL</p><p className="text-emerald-400 font-bold">+₹4,218</p></div>
        <div><p className="text-xs text-slate-500">Throughput</p><p className="text-white font-bold">142.6 kWh</p></div>
        <div><p className="text-xs text-slate-500">Avg Spread</p><p className="text-sky-400 font-bold">₹0.0102</p></div>
        <div><p className="text-xs text-slate-500">C_deg</p><p className="text-amber-400 font-bold">₹0.0043/kWh</p></div>
      </div>
    </div>
  );
}

function RiskParams() {
  return (
    <div className="p-4 h-32">
      <p className="text-xs uppercase tracking-widest text-slate-400 font-mono mb-2">Risk Parameters</p>
      <div className="grid grid-cols-2 gap-3 font-mono text-sm">
        <div><p className="text-xs text-slate-500">σ</p><p className="text-white font-bold">0.0600</p></div>
        <div><p className="text-xs text-slate-500">γ</p><p className="text-white font-bold">1.50</p></div>
        <div><p className="text-xs text-slate-500">SoC floor</p><p className="text-rose-400 font-bold">10.0%</p></div>
        <div><p className="text-xs text-slate-500">SoC ceiling</p><p className="text-emerald-400 font-bold">95.0%</p></div>
      </div>
    </div>
  );
}

export default function BatteryPage() {
  const openAuth = useStore((s) => s.openAuth);
  const hasPromptedRef = useRef(false);
  const [simCapacity, setSimCapacity] = useState(100);

  const handleSimSlider = useCallback(() => {
    if (!hasPromptedRef.current) {
      hasPromptedRef.current = true;
      openAuth('signup');
    }
  }, [openAuth]);

  return (
    <>
      <div className="bg-gradient-to-b from-slate-900 to-transparent border-b border-slate-800 py-12 px-4">
        <div className="max-w-7xl mx-auto">
          <p className="text-xs uppercase tracking-widest text-emerald-400 font-mono mb-2">
            BATTERY MARKET MAKER
          </p>
          <h1 className="text-3xl sm:text-4xl font-bold text-white">
            The Engine Room: Autonomous Liquidity.
          </h1>
          <p className="text-slate-400 mt-3 max-w-2xl text-sm">
            GLFT bounded-inventory quoting + Rainflow degradation pricing running
            continuously at 10 Hz.
          </p>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-4">
        <div className="grid md:grid-cols-2 gap-4">
          <Panel className="p-4">
            <h2 className="text-xs uppercase tracking-widest text-slate-400 mb-3 font-mono">
              State of Charge
            </h2>
            <BatteryGauge />
          </Panel>
          <Panel className="p-4">
            <h2 className="text-xs uppercase tracking-widest text-slate-400 mb-3 font-mono">
              Rainflow DoD Histogram
            </h2>
            <RainflowHistogram />
          </Panel>
          <Panel className="p-4">
            <h2 className="text-xs uppercase tracking-widest text-slate-400 mb-3 font-mono">
              GLFT Inventory Boundaries
            </h2>
            <InventoryBoundaryChart />
          </Panel>
          <Panel>
            <LockOverlay
              title="PnL Metrics"
              body="Sign in to view live profitability and throughput metrics."
              ctaLabel="Sign In"
            >
              <PnlMetrics />
            </LockOverlay>
          </Panel>
        </div>

        <Panel>
          <LockOverlay
            title="Risk Parameters"
            body="Sign in to view exact risk-aversion and boundary parameters."
            ctaLabel="Sign In"
          >
            <RiskParams />
          </LockOverlay>
        </Panel>

        <Panel className="p-5">
          <h2 className="text-xs uppercase tracking-widest text-slate-400 mb-1 font-mono">
            Simulate Your Battery
          </h2>
          <p className="text-xs text-slate-500 mb-4">
            Adjust parameters to preview market-making performance.
          </p>
          <div className="flex flex-col gap-2">
            <div className="flex justify-between text-xs font-mono text-slate-400">
              <span>Capacity (kWh)</span>
              <span>{simCapacity} kWh</span>
            </div>
            <input
              type="range"
              min={10}
              max={500}
              step={10}
              value={simCapacity}
              onChange={(e) => {
                setSimCapacity(parseInt(e.target.value, 10));
                handleSimSlider();
              }}
              className="w-full h-1.5 rounded-full appearance-none cursor-pointer bg-slate-700 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-emerald-500"
              aria-label="Battery capacity"
            />
          </div>
          <p className="text-xs text-slate-600 mt-2 font-mono">
            Deploy Your Virtual Market Maker — sign in to run full simulations.
          </p>
        </Panel>
      </main>
    </>
  );
}
