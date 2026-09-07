'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X } from 'lucide-react';

import { useStore } from '@/lib/store';
import { AuthButtons } from './AuthButtons';
import { MobileMenu } from './MobileMenu';

/** All top-level navigation destinations. */
const navigationTabs = [
  { label: 'Dashboard', href: '/dashboard' },
  { label: 'Grid', href: '/grid' },
  { label: 'Battery', href: '/battery' },
  { label: 'Pricing', href: '/pricing' },
  { label: 'About', href: '/about' },
  { label: 'Contact', href: '/contact' },
];

/**
 * Navbar — global site header fixed at 64 px height.
 *
 * - Logo "SOVEREIGN-AMM" links to "/"
 * - Desktop tabs with active-state highlighting via usePathname()
 * - Auth buttons (Sign In / Sign Up Now) when not in demo mode; DEMO MODE
 *   label when demoUser === true (opens the AuthDrawer, no route navigation)
 * - Mobile hamburger below 768 px that toggles MobileMenu
 *
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.8, 2.9, 10.12
 */
export function Navbar() {
  const pathname = usePathname();
  const demoUser = useStore((s) => s.demoUser);
  const openAuth = useStore((s) => s.openAuth);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const closeMobileMenu = () => setMobileMenuOpen(false);

  return (
    <header className="sticky top-0 z-50 bg-slate-900 border-b border-slate-800">
      <nav
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between"
        aria-label="Main navigation"
      >
        {/* ── Left: Logo ──────────────────────────────────────────────────── */}
        <div className="flex items-center gap-8">
          <Link
            href="/"
            className="text-lg font-bold tracking-widest text-white uppercase font-display"
            aria-label="Sovereign-AMM home"
          >
            SOVEREIGN-AMM
          </Link>

          {/* ── Desktop tabs (hidden on mobile) ───────────────────────────── */}
          <div className="hidden md:flex items-center gap-1">
            {navigationTabs.map((tab) => {
              const isActive =
                pathname === tab.href ||
                pathname.startsWith(tab.href + '/');

              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-slate-800 text-white'
                      : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                  }`}
                  aria-current={isActive ? 'page' : undefined}
                >
                  {tab.label}
                </Link>
              );
            })}
          </div>
        </div>

        {/* ── Right: Auth area + hamburger ────────────────────────────────── */}
        <div className="flex items-center gap-3">
          {/* Auth / user section — always shown */}
          {demoUser ? (
            <span className="text-sm text-emerald-400 font-mono">DEMO MODE</span>
          ) : (
            <AuthButtons />
          )}

          {/* Hamburger — visible only on mobile */}
          <button
            className="md:hidden p-2 rounded-md text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={mobileMenuOpen}
            aria-controls="mobile-menu"
          >
            {mobileMenuOpen ? (
              <X className="h-6 w-6" aria-hidden="true" />
            ) : (
              <Menu className="h-6 w-6" aria-hidden="true" />
            )}
          </button>
        </div>
      </nav>

      {/* ── Mobile menu dropdown ────────────────────────────────────────────── */}
      {mobileMenuOpen && (
        <div id="mobile-menu">
          <MobileMenu
            tabs={navigationTabs}
            currentPath={pathname}
            onClose={closeMobileMenu}
          />
        </div>
      )}
    </header>
  );
}

export default Navbar;
