'use client';

/**
 * Dashboard Page — authenticated trading terminal.
 *
 * Composes the full dashboard: sticky ticker tape, connection health banner,
 * 3-column system cards, and the feature carousel + sidebar layout.
 *
 * WebSocket is established here so all child components share a single
 * connection (Requirement 4.1). The token comes from the Zustand auth store
 * which is populated by the (dashboard)/layout.tsx auth guard.
 *
 * Requirements: 1.3, 4.1, 24.2
 */

import { useAuthStore } from '@/store/authStore';
import { useWebSocket } from '@/hooks/useWebSocket';
import TickerTape from '@/components/ticker/TickerTape';
import SystemCards from '@/components/cards/SystemCards';
import FeatureCarousel from '@/components/carousel/FeatureCarousel';
import Sidebar from '@/components/sidebar/Sidebar';
import ConnectionStatus from '@/components/ui/ConnectionStatus';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL ?? 'ws://localhost:8000/ws';

export default function DashboardPage() {
  const token = useAuthStore((s) => s.token);

  // Establish the shared WebSocket connection for all dashboard components.
  // The hook writes incoming ticks straight into the Zustand market store;
  // child components subscribe to individual slices without prop-drilling.
  useWebSocket(WS_URL, token);

  return (
    <>
      {/* ── Ticker tape: sticky directly below the navbar ─────────────────── */}
      <TickerTape />

      {/* ── Main content area ─────────────────────────────────────────────── */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Connection health banner — renders nothing when healthy */}
        <ConnectionStatus />

        {/* ── System cards: Battery Gauge | Quote Explanation | Judge Controls */}
        <SystemCards />

        {/* ── Carousel + Sidebar row ────────────────────────────────────── */}
        <div className="flex flex-col lg:flex-row gap-6 mt-8">
          <FeatureCarousel />
          <Sidebar />
        </div>
      </main>
    </>
  );
}
