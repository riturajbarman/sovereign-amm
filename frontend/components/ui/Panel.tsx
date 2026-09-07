'use client';

/**
 * @file Panel.tsx
 * @description Base container panel used throughout the Sovereign-AMM dashboard.
 *
 * Applies the standard dark-glass card treatment:
 *   rounded-xl  border border-slate-800  bg-slate-900/60  backdrop-blur-sm
 *
 * Requirements addressed: 30.1, 30.2
 */

import React from 'react';
import { cn } from '@/lib/utils';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface PanelProps {
  /** Panel contents. */
  children: React.ReactNode;
  /** Additional Tailwind classes merged via cn(). */
  className?: string;
}

// ---------------------------------------------------------------------------
// Panel
// ---------------------------------------------------------------------------

/**
 * Base dark-glass container used by all dashboard cards and panels.
 *
 * @example
 * <Panel className="p-4">
 *   <StatTile label="MICRO PRICE" value="₹4.8534" />
 * </Panel>
 */
export function Panel({ children, className }: PanelProps): React.ReactElement {
  return (
    <div
      className={cn(
        'rounded-xl border border-slate-800 bg-slate-900/60 backdrop-blur-sm',
        className,
      )}
    >
      {children}
    </div>
  );
}

export default Panel;
