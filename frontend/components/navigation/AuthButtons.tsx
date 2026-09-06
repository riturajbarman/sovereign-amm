'use client';

import { useStore } from '@/lib/store';

/**
 * AuthButtons — rendered in the Navbar when the user is NOT authenticated.
 *
 * "Sign In" calls openAuth('signin') — opens the right-side drawer.
 * "Sign Up Now" calls openAuth('signup') — opens the right-side drawer.
 *
 * Neither button navigates to a route. Requirements: 10.12
 */
export function AuthButtons() {
  const openAuth = useStore((s) => s.openAuth);
  return (
    <div className="flex items-center gap-3">
      <button
        onClick={() => openAuth('signin')}
        className="px-4 py-2 text-sm font-medium text-slate-300 border border-slate-600 rounded-md hover:bg-slate-800 hover:text-white transition-colors"
      >
        Sign In
      </button>
      <button
        onClick={() => openAuth('signup')}
        className="px-4 py-2 text-sm font-semibold text-white bg-emerald-600 rounded-md hover:bg-emerald-700 transition-colors"
      >
        Sign Up Now
      </button>
    </div>
  );
}

export default AuthButtons;
