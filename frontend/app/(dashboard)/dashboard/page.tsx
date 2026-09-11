'use client';
import dynamic from 'next/dynamic';
import { useStore } from '@/lib/store';
import { Panel } from '@/components/ui/Panel';
import { LockOverlay } from '@/components/layout/LockOverlay';
import { TickerTape } from '@/components/landing/TickerTape';
import { StatTile } from '@/components/ui/StatTile';
import { formatPrice, formatOBI } from '@/lib/utils';
import { useTickFlash } from '@/lib/hooks/useTickFlash';

const DepthChart = dynamic(() => import('@/components/charts/DepthChart').then(m => m.DepthChart), { ssr: false });
const PriceStateChart = dynamic(() => import('@/components/charts/PriceStateChart').then(m => m.PriceStateChart), { ssr: false });
const BatteryGauge = dynamic(() => import('@/components/charts/BatteryGauge').then(m => m.BatteryGauge), { ssr: false });
const ObiGauge = dynamic(() => import('@/components/charts/ObiGauge').then(m => m.ObiGauge), { ssr: false });

function PnlPanel() {
  return (
    <div className="flex flex-col gap-2 p-4 h-40">
      <p className="text-xs uppercase tracking-widest text-slate-400 font-mono">P&L Summary</p>
      <p className="text-2xl font-bold font-mono text-emerald-400">+₹12,847</p>
      <p className="text-xs text-slate-500 font-mono">Unrealised: +₹3,201</p>
    </div>
  );
}

function FillsTable() {
  return (
    <div className="p-4 h-40">
      <p className="text-xs uppercase tracking-widest text-slate-400 font-mono mb-2">Recent Fills</p>
      <div className="text-xs font-mono text-slate-400 space-y-1">
        <div className="flex justify-between"><span className="text-emerald-400">BUY</span><span>₹4.8530</span><span>3.2 kWh</span></div>
        <div className="flex justify-between"><span className="text-rose-500">SELL</span><span>₹4.8620</span><span>1.8 kWh</span></div>
        <div className="flex justify-between"><span className="text-emerald-400">BUY</span><span>₹4.8490</span><span>5.1 kWh</span></div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { microPrice, bestBid, bestAsk, obi } = useStore((s) => ({
    microPrice: s.microPrice,
    bestBid: s.bestBid,
    bestAsk: s.bestAsk,
    obi: s.obi,
  }));
  const microFlash = useTickFlash(microPrice);

  return (
    <>
      <TickerTape />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Trading Dashboard</h1>
          <p className="text-xs text-slate-500 font-mono">MICROGRID-KWH · SPOT · 10 Hz</p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatTile label="MICRO PRICE" value={formatPrice(microPrice, 4)} flashClass={microFlash} />
          <StatTile label="BEST BID" value={formatPrice(bestBid.px, 3)} />
          <StatTile label="BEST ASK" value={formatPrice(bestAsk.px, 3)} />
          <StatTile label="OBI" value={formatOBI(obi)} />
        </div>

        <div className="grid md:grid-cols-[1fr_2fr] gap-4">
          <Panel className="p-4">
            <h2 className="text-xs uppercase tracking-widest text-slate-400 mb-2 font-mono">L2 Order Book</h2>
            <DepthChart />
          </Panel>
          <Panel className="p-4">
            <h2 className="text-xs uppercase tracking-widest text-slate-400 mb-2 font-mono">Price & SoC</h2>
            <PriceStateChart />
          </Panel>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Panel className="p-4"><BatteryGauge /></Panel>
          <Panel className="p-4"><ObiGauge /></Panel>
          <Panel>
            <LockOverlay
              title="Your Terminal, Live."
              body="Sign in to view live PnL, fills, and inventory positions."
              ctaLabel="Sign In"
            >
              <PnlPanel />
            </LockOverlay>
          </Panel>
          <Panel>
            <LockOverlay
              title="Your Terminal, Live."
              body="Sign in to view live fills and inventory positions."
              ctaLabel="Sign In"
            >
              <FillsTable />
            </LockOverlay>
          </Panel>
        </div>
      </main>
    </>
  );
}
