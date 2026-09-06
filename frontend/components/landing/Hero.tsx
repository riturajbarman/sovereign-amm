'use client';

/**
 * @file Hero.tsx
 * @description Landing-page hero section for Sovereign-AMM.
 *
 * Three pure-CSS background layers (no canvas, no JS animation libraries):
 *   1. Radial gradient vignette  — deep slate-to-black depth layer
 *   2. Dotted grid               — 40×40 dot pattern at ~4 % opacity
 *   3. Grid-line texture         — 1 px lines at 40 px intervals with a
 *                                  top-and-bottom mask fade
 *
 * CTA buttons open the auth drawer via `openAuth` from the Zustand store
 * instead of navigating to separate pages, keeping the user in-context.
 *
 * Requirements: 3.1 – 3.9
 */

import { useStore } from '@/lib/store';

export function Hero() {
  const openAuth = useStore((s) => s.openAuth);

  return (
    <section
      className="relative w-full overflow-hidden"
      aria-label="Hero section"
      style={{
        /* Layer 1: radial vignette */
        background: 'radial-gradient(ellipse at center, #0f172a 0%, #0a0a0a 70%)',
      }}
    >
      {/* ── Layer 2: dotted grid (~4 % opacity) ── */}
      <div
        aria-hidden="true"
        className="absolute inset-0"
        style={{
          backgroundImage:
            'radial-gradient(circle, #334155 1px, transparent 1px)',
          backgroundSize: '40px 40px',
          opacity: 0.04,
        }}
      />

      {/* ── Layer 3: grid-line texture with top/bottom mask fade ── */}
      <div
        aria-hidden="true"
        className="absolute inset-0"
        style={{
          backgroundImage: [
            'linear-gradient(to right,  rgba(51,65,85,0.3) 1px, transparent 1px)',
            'linear-gradient(to bottom, rgba(51,65,85,0.3) 1px, transparent 1px)',
          ].join(', '),
          backgroundSize: '40px 40px',
          maskImage:
            'linear-gradient(to bottom, transparent 0%, white 20%, white 80%, transparent 100%)',
          WebkitMaskImage:
            'linear-gradient(to bottom, transparent 0%, white 20%, white 80%, transparent 100%)',
        }}
      />

      {/* ── Ambient emerald glow behind the headline ── */}
      <div
        aria-hidden="true"
        className="absolute inset-0 flex items-start justify-center pointer-events-none"
      >
        <div
          className="w-[700px] h-[400px] rounded-full blur-3xl opacity-[0.12] mt-8"
          style={{
            background:
              'radial-gradient(ellipse at center, #10b981 0%, transparent 70%)',
          }}
        />
      </div>

      {/* ── Content ── */}
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 sm:py-32 text-center">

        {/* Status pill */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 mb-8 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-xs font-mono font-semibold tracking-widest uppercase">
          <span
            className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"
            aria-hidden="true"
          />
          10 HZ MATCHING ENGINE · LIVE
        </div>

        {/* Headline */}
        <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold font-display text-white mb-4 tracking-tight leading-[1.05]">
          Deterministic Energy
          <br />
          <span className="text-emerald-500">Markets</span>
        </h1>

        {/* Subtitle */}
        <p className="text-2xl sm:text-3xl font-semibold text-slate-300 mb-6">
          Powered by{' '}
          <span className="text-emerald-400">Grid Physics</span>
        </p>

        {/* Body paragraph */}
        <p className="text-base sm:text-lg text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed">
          Sovereign-AMM is a high-frequency limit order book for microgrid energy
          markets. Our battery-based algorithmic market maker uses the{' '}
          <abbr
            title="Guéant–Lehalle–Fernandez-Tapia bounded-inventory model"
            className="no-underline"
          >
            GLFT
          </abbr>{' '}
          bounded-inventory model to price energy in real time — combining grid
          physics (PTDF), rainflow degradation costs, and zero-knowledge solvency
          proofs for deterministic, trustless settlement.
        </p>

        {/* CTA buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-14">
          <button
            type="button"
            onClick={() => openAuth('signup')}
            className="inline-flex items-center justify-center px-8 py-4 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-lg font-semibold rounded-lg transition-colors focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 shadow-lg min-w-[180px]"
          >
            Sign Up Now
          </button>
          <button
            type="button"
            onClick={() => openAuth('signin')}
            className="inline-flex items-center justify-center px-8 py-4 bg-transparent hover:bg-slate-800 active:bg-slate-700 text-white text-lg font-semibold rounded-lg border border-slate-600 hover:border-slate-500 transition-colors focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 min-w-[180px]"
          >
            Sign In
          </button>
        </div>

        {/* Stats bar */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-0 text-xs font-mono text-slate-500">
          <span className="px-4">10 Hz Update Rate</span>
          <span
            className="hidden sm:block w-px h-4 bg-slate-700"
            aria-hidden="true"
          />
          <span className="px-4">GLFT Pricing Model</span>
          <span
            className="hidden sm:block w-px h-4 bg-slate-700"
            aria-hidden="true"
          />
          <span className="px-4">ZK Solvency Ready</span>
        </div>

      </div>
    </section>
  );
}
