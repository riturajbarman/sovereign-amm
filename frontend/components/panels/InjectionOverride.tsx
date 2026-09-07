'use client';

import { useState, useRef, useEffect } from 'react';
import { useStore } from '@/lib/store';

// ---------------------------------------------------------------------------
// InjectionOverride
// ---------------------------------------------------------------------------

/**
 * Node injection override control panel.
 *
 * Allows an operator to select any bus in the 7-bus microgrid and apply a
 * delta injection in MW via a range slider (−5 … +5 MW). Clicking
 * "INJECT LOAD SPIKE" calls `applyInjection` from the grid slice and starts
 * an 8-second auto-decay timer that calls `resetGrid` when it expires.
 *
 * The active state is cleared immediately if the operator clicks "RESET GRID"
 * manually. The decay timer is also cancelled on unmount to prevent the
 * setState-after-unmount warning.
 */
export function InjectionOverride() {
  const buses          = useStore((s) => s.buses);
  const applyInjection = useStore((s) => s.applyInjection);
  const resetGrid      = useStore((s) => s.resetGrid);

  const [selectedBus, setSelectedBus] = useState<string>('BUS-05');
  const [mw, setMw]                   = useState<number>(0);
  const [active, setActive]           = useState<boolean>(false);

  const decayRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clear pending timer on unmount
  useEffect(
    () => () => {
      if (decayRef.current) clearTimeout(decayRef.current);
    },
    [],
  );

  const inject = () => {
    if (decayRef.current) clearTimeout(decayRef.current);
    applyInjection(selectedBus, mw);
    setActive(true);
    decayRef.current = setTimeout(() => {
      resetGrid();
      setActive(false);
    }, 8000);
  };

  const reset = () => {
    if (decayRef.current) clearTimeout(decayRef.current);
    resetGrid();
    setActive(false);
  };

  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-xs uppercase tracking-widest text-slate-400 font-sans">
        Node Injection Override
      </h2>

      {/* Bus selector */}
      <div className="flex flex-col gap-2">
        <label className="text-xs text-slate-400">Bus</label>
        <select
          value={selectedBus}
          onChange={(e) => setSelectedBus(e.target.value)}
          className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
        >
          {buses.map((b) => (
            <option key={b.id} value={b.id}>
              {b.id} — {b.label}
            </option>
          ))}
        </select>
      </div>

      {/* MW slider */}
      <div className="flex flex-col gap-1">
        <div className="flex justify-between">
          <label className="text-xs text-slate-400">Injection (MW)</label>
          <span className="text-xs font-mono text-slate-200 tabular-nums">
            {mw >= 0 ? '+' : ''}
            {mw.toFixed(1)} MW
          </span>
        </div>
        <input
          type="range"
          min={-5}
          max={5}
          step={0.1}
          value={mw}
          onChange={(e) => setMw(parseFloat(e.target.value))}
          aria-label="Injection MW"
          className="w-full h-1.5 rounded-full appearance-none cursor-pointer bg-slate-700 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-emerald-500"
        />
      </div>

      {/* Action buttons */}
      <div className="flex gap-2">
        <button
          onClick={inject}
          className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg transition-colors"
        >
          INJECT LOAD SPIKE
        </button>
        <button
          onClick={reset}
          className="flex-1 py-2 border border-slate-700 hover:border-slate-500 text-slate-300 text-xs rounded-lg transition-colors"
        >
          RESET GRID
        </button>
      </div>

      {/* Active indicator */}
      {active && (
        <p className="text-xs text-amber-500 font-mono">
          ACTIVE — auto-reset in ~8s
        </p>
      )}
    </div>
  );
}

export default InjectionOverride;
