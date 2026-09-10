/**
 * @file store.ts
 * @description Central Zustand store for Sovereign-AMM. Combines five
 * independent slices — market, battery, grid, judge, and UI — into a single
 * `useStore` hook backed by `subscribeWithSelector` so components can
 * subscribe to granular field changes without triggering full re-renders.
 *
 * ## Slice overview
 *
 * | Slice   | Responsibility                                               |
 * |---------|--------------------------------------------------------------|
 * | market  | Live L2 order book, micro-price, OBI, trade tape, timeseries |
 * | battery | SoC, inventory `q`, sigma, gamma, C_deg                      |
 * | grid    | 7-bus topology, line flows, congestion flags                  |
 * | judge   | Operator-tunable parameters (volatility, risk aversion, …)   |
 * | ui      | Auth drawer open/mode, demo-user flag                        |
 *
 * Requirements addressed: 1.1 – 4.x (market), 7.x (battery), 8.x (grid),
 * 9.x (judge controls), 10.x (UI/auth drawer).
 */

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

import {
  INITIAL_BOOK,
  stepBook,
  computeOBI,
  computeMicroPrice,
} from '@/lib/mock/orderbook';
import { INITIAL_SERIES } from '@/lib/mock/timeseries';
import { GRID_DATA, stepGrid } from '@/lib/mock/grid';

import type {
  OrderBook,
  Level,
  Trade,
  TimeseriesPoint,
  Bus,
  Line,
  GridData,
  AuthMode,
} from '@/lib/types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Derive initial congestion flags from a set of lines. */
function buildCongestionFlags(lines: Line[]): Record<string, boolean> {
  return Object.fromEntries(lines.map((l) => [l.id, l.status !== 'normal']));
}

// ---------------------------------------------------------------------------
// Last point from the pre-generated timeseries (used for init)
// ---------------------------------------------------------------------------

const _lastPoint: TimeseriesPoint = INITIAL_SERIES[INITIAL_SERIES.length - 1];

/** Initial inventoryQ derived from last timeseries SoC. */
const _initInventoryQ: number = Math.max(
  -1,
  Math.min(1, 2 * (_lastPoint.soc / 100) - 1),
);

// ---------------------------------------------------------------------------
// StoreState — the complete store shape
// ---------------------------------------------------------------------------

/**
 * Full type of the Zustand store. All fields and actions live here.
 *
 * Consumers should import `useStore` and select specific fields:
 * ```ts
 * const microPrice = useStore((s) => s.microPrice);
 * ```
 */
export interface StoreState {
  // ── Market slice ──────────────────────────────────────────────────────────

  /**
   * Current L2 order book snapshot (12 bid + 12 ask levels).
   * Initialised from `INITIAL_BOOK` (seed 0x5EED).
   */
  book: OrderBook;

  /**
   * Volume-weighted mid-price in ₹/kWh.
   * Formula: `(P_bid × V_ask + P_ask × V_bid) / (V_bid + V_ask)`
   * Reference: Stoikov (2018), "The Micro-Price".
   */
  microPrice: number;

  /** Best bid level (highest buy price in the book). */
  bestBid: Level;

  /** Best ask level (lowest sell price in the book). */
  bestAsk: Level;

  /**
   * Order Book Imbalance over the top 5 levels.
   * `OBI = (Σbid.sz[0..4] − Σask.sz[0..4]) / (Σbid.sz[0..4] + Σask.sz[0..4])`
   * Range: [−1, +1]. Positive = more buy pressure.
   */
  obi: number;

  /**
   * Rolling trade tape capped at 50 entries (newest first).
   * Trade side is determined by OBI sign: `obi > 0 → 'buy'`, else `'sell'`.
   */
  trades: Trade[];

  /**
   * Historical price / SoC / C_deg timeseries (240 pre-generated points +
   * live ticks appended on each `tickMarket` call).
   */
  timeseries: TimeseriesPoint[];

  /**
   * Advance the market by one tick.
   *
   * Steps the order book via `stepBook`, recomputes micro-price, OBI, and
   * best bid/ask. Appends one trade to the tape (side driven by OBI so there
   * is no stochastic `Math.random()` call in this path). Updates SoC and
   * `inventoryQ` to reflect the simulated trade flow.
   */
  tickMarket(): void;

  // ── Battery slice ─────────────────────────────────────────────────────────

  /**
   * Battery State of Charge in percent, clamped to [18, 92].
   * Initialised from the last point of the pre-generated timeseries.
   */
  soc: number;

  /**
   * Volatility parameter σ passed to the GLFT quoting model.
   * Default: 0.06 (≈ 6 % diffusion coefficient).
   */
  sigma: number;

  /**
   * Risk-aversion coefficient γ used in the GLFT spread formula.
   * Default: 1.5.
   */
  gamma: number;

  /**
   * Rainflow marginal degradation cost in ₹/kWh.
   * `C_deg(d) = C_cap / (2 × N_cycles(d) × E_nom × η)`
   * Initialised from the last point of the pre-generated timeseries.
   */
  cDeg: number;

  /**
   * Normalised inventory parameter `q ∈ [−1, +1]`.
   * `q = 2 × (soc / 100) - 1`  (linear map from [0 %..100 %] to [−1..+1]).
   */
  inventoryQ: number;

  // ── Grid slice ────────────────────────────────────────────────────────────

  /** 7-bus array for the campus microgrid topology. */
  buses: Bus[];

  /** 9-line array with current flows, utilizations, and congestion statuses. */
  lines: Line[];

  /**
   * Per-line congestion flag map.
   * `congestionFlags[lineId] === true` when `line.status !== 'normal'`
   * (i.e., utilization > 85 %).
   */
  congestionFlags: Record<string, boolean>;

  /**
   * Apply a delta injection override to a single bus and recompute all line
   * flows via DC power-flow PTDF sensitivity.
   *
   * @param busId - Bus identifier, e.g. `"BUS-05"`
   * @param mw    - Delta injection in MW (positive = generation, negative = load)
   */
  applyInjection(busId: string, mw: number): void;

  /**
   * Reset the grid to the static `GRID_DATA` snapshot, clearing all
   * injection overrides.
   */
  resetGrid(): void;

  // ── Judge slice ───────────────────────────────────────────────────────────

  /**
   * Operator-visible volatility override in [0.01, 0.20].
   * Feeds into the GLFT spread formula: `σ²γ / (2kA)`.
   * Default: 0.06.
   */
  volatility: number;

  /**
   * Operator-visible risk-aversion override in [0.1, 5.0].
   * Higher values widen the GLFT spread.
   * Default: 1.5.
   */
  riskAversion: number;

  /**
   * Degradation weight scalar in [0, 1].
   * Scales the `C_deg` surcharge: `effectiveCDeg = cDeg × degradationWeight`.
   * Default: 0.5.
   */
  degradationWeight: number;

  /**
   * Load shock injection level in [0, 100] MW.
   * Positive values simulate a sudden demand spike at the load buses.
   * Default: 0.
   */
  loadShock: number;

  /**
   * Patch one or more judge parameters in a single atomic update.
   *
   * @param patch - Partial subset of `{volatility, riskAversion, degradationWeight, loadShock}`
   */
  setJudge(
    patch: Partial<{
      volatility: number;
      riskAversion: number;
      degradationWeight: number;
      loadShock: number;
    }>,
  ): void;

  /** Reset all judge parameters to their default values. */
  resetJudge(): void;

  // ── UI slice ──────────────────────────────────────────────────────────────

  /** Whether the authentication slide-in drawer is currently visible. */
  authDrawerOpen: boolean;

  /**
   * Current mode of the auth drawer.
   * `'signin'` shows the sign-in form; `'signup'` shows the registration form.
   */
  authMode: AuthMode;

  /**
   * `true` when the user is browsing as a guest / demo user.
   * Unlocks read-only dashboard access without a real account.
   */
  demoUser: boolean;

  /** The authenticated user's JWT token */
  jwtToken: string | null;


  /**
   * Open the auth drawer in the specified mode.
   *
   * @param mode - `'signin'` or `'signup'`
   */
  openAuth(mode: AuthMode): void;

  /** Close the auth drawer without changing `authMode`. */
  closeAuth(): void;

  /** Set the JWT token after successful login */
  setJwtToken(token: string): void;
}

// ---------------------------------------------------------------------------
// Store implementation
// ---------------------------------------------------------------------------

export const useStore = create<StoreState>()(
  subscribeWithSelector((set) => ({
    // ── Market slice ────────────────────────────────────────────────────────

    book: INITIAL_BOOK,
    microPrice: computeMicroPrice(INITIAL_BOOK),
    bestBid: INITIAL_BOOK.bids[0],
    bestAsk: INITIAL_BOOK.asks[0],
    obi: computeOBI(INITIAL_BOOK),
    trades: [],
    timeseries: INITIAL_SERIES,

    tickMarket: () =>
      set((s) => {
        const book = stepBook(s.book);
        const microPrice = computeMicroPrice(book);
        const obi = computeOBI(book);

        // Trade size is a deterministic function of OBI — no Math.random().
        const trade: Trade = {
          id: `t-${book.seq}`,
          ts: Date.now(),
          side: obi > 0 ? 'buy' : 'sell',
          px: microPrice,
          sz: Math.max(0.1, Math.abs(obi) * 5.0 + 0.1),
        };

        // SoC drifts with trade pressure (buy pressure = battery discharges).
        const newSoc = Math.min(
          92,
          Math.max(18, s.soc + (obi > 0 ? -0.5 : 0.3)),
        );
        const newInventoryQ = Math.max(-1, Math.min(1, 2 * (newSoc / 100) - 1));

        return {
          book,
          microPrice,
          obi,
          bestBid: book.bids[0],
          bestAsk: book.asks[0],
          trades: [trade, ...s.trades].slice(0, 50),
          soc: newSoc,
          inventoryQ: newInventoryQ,
        };
      }),

    // ── Battery slice ───────────────────────────────────────────────────────

    soc: _lastPoint.soc,
    sigma: 0.06,
    gamma: 1.5,
    cDeg: _lastPoint.cDeg,
    inventoryQ: _initInventoryQ,

    // ── Grid slice ──────────────────────────────────────────────────────────

    buses: GRID_DATA.buses,
    lines: GRID_DATA.lines,
    congestionFlags: buildCongestionFlags(GRID_DATA.lines),

    applyInjection: (busId: string, mw: number) =>
      set((s) => {
        const injection: Record<string, number> = { [busId]: mw };
        const gridSnapshot: GridData = {
          buses: s.buses,
          lines: s.lines,
          ptdf: GRID_DATA.ptdf,
        };
        const updated = stepGrid(gridSnapshot, injection);
        const congestionFlags = buildCongestionFlags(updated.lines);
        return {
          buses: updated.buses,
          lines: updated.lines,
          congestionFlags,
        };
      }),

    resetGrid: () =>
      set({
        buses: GRID_DATA.buses,
        lines: GRID_DATA.lines,
        congestionFlags: buildCongestionFlags(GRID_DATA.lines),
      }),

    // ── Judge slice ─────────────────────────────────────────────────────────

    volatility: 0.06,
    riskAversion: 1.5,
    degradationWeight: 0.5,
    loadShock: 0,

    setJudge: (
      patch: Partial<{
        volatility: number;
        riskAversion: number;
        degradationWeight: number;
        loadShock: number;
      }>,
    ) => set(patch),

    resetJudge: () =>
      set({
        volatility: 0.06,
        riskAversion: 1.5,
        degradationWeight: 0.5,
        loadShock: 0,
      }),

    // ── UI slice ─────────────────────────────────────────────────────────────

    authDrawerOpen: false,
    authMode: 'signin' as AuthMode,
    demoUser: false,
    jwtToken: null,

    openAuth: (mode: AuthMode) => set({ authDrawerOpen: true, authMode: mode }),
    closeAuth: () => set({ authDrawerOpen: false }),
    setJwtToken: (token: string) => set({ jwtToken: token }),
  })),
);
