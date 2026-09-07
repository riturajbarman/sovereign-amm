'use client';
import dynamic from 'next/dynamic';
import { Hero } from '@/components/landing/Hero';
import { TickerTape } from '@/components/landing/TickerTape';
import { RecentArticles } from '@/components/landing/RecentArticles';

// Heavy components loaded client-side only to avoid SSR/hydration issues
const TerminalCarousel = dynamic(
  () => import('@/components/landing/TerminalCarousel').then((m) => m.TerminalCarousel),
  { ssr: false },
);
const RagCopilot = dynamic(
  () => import('@/components/landing/RagCopilot').then((m) => m.RagCopilot),
  { ssr: false },
);
const SystemCardsGrid = dynamic(
  () => import('@/components/landing/SystemCardsGrid').then((m) => m.SystemCardsGrid),
  { ssr: false },
);

export default function HomePage() {
  return (
    <>
      {/* 1. Hero */}
      <Hero />

      {/* 2. Ticker Tape */}
      <TickerTape />

      {/* 3. Carousel + Sidebar */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid lg:grid-cols-[1fr_400px] gap-6">
          {/* Left: carousel */}
          <TerminalCarousel />

          {/* Right: sidebar stack */}
          <aside className="flex flex-col gap-6">
            <div className="rounded-xl border border-slate-800 bg-slate-900/60 backdrop-blur-sm p-5">
              <RecentArticles />
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-900/60 backdrop-blur-sm p-5">
              <RagCopilot />
            </div>
          </aside>
        </div>
      </section>

      {/* 4. System Cards Grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        <div className="mb-4">
          <p className="text-xs uppercase tracking-widest text-slate-500 font-mono mb-1">
            Live System Status
          </p>
          <h2 className="text-xl font-bold text-white">Engine Telemetry</h2>
        </div>
        <SystemCardsGrid />
      </section>
    </>
  );
}
