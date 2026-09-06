'use client';

import Link from 'next/link';

/**
 * AuthButtons — rendered in the Navbar when the user is NOT authenticated.
 *
 * "Sign In" uses a ghost/outline style.
 * "Sign Up Now" uses an emerald-filled primary style.
 *
 * Requirements: 2.8, 2.9
 */
export function AuthButtons() {
  return (
    <div className="flex items-center gap-3">
      {/* Ghost / outline button */}
      <Link
        href="/login"
        className="px-4 py-2 text-sm font-medium text-slate-300 border border-slate-600 rounded-md hover:bg-slate-800 hover:text-white transition-colors"
      >
        Sign In
      </Link>

      {/* Filled emerald button */}
      <Link
        href="/register"
        className="px-4 py-2 text-sm font-semibold text-white bg-emerald-600 rounded-md hover:bg-emerald-700 transition-colors"
      >
        Sign Up Now
      </Link>
    </div>
  );
}
