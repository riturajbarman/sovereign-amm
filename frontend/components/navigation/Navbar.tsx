'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X, LogOut, User as UserIcon } from 'lucide-react';

import { useAuthStore } from '@/store/authStore';
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
 * - Auth buttons (Sign In / Sign Up Now) when logged out; user menu when logged in
 * - Mobile hamburger below 768 px that toggles MobileMenu
 *
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.8, 2.9
 */
export function Navbar() {
  const pathname = usePathname();
  const { isAuthenticated, user, logout } = useAuthStore();
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
          {isAuthenticated ? (
            <UserMenu email={user?.email ?? ''} onLogout={logout} />
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

// ── Internal sub-component ───────────────────────────────────────────────────

interface UserMenuProps {
  email: string;
  onLogout: () => void;
}

/**
 * UserMenu — compact inline dropdown shown when the user is authenticated.
 * Displays the user's email and a logout button.
 */
function UserMenu({ email, onLogout }: UserMenuProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((prev) => !prev)}
        className="flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
        aria-label="User menu"
        aria-expanded={open}
        aria-haspopup="true"
      >
        <UserIcon className="h-4 w-4" aria-hidden="true" />
        <span className="hidden sm:inline max-w-[160px] truncate">{email}</span>
      </button>

      {open && (
        <div
          className="absolute right-0 mt-1 w-48 bg-slate-800 border border-slate-700 rounded-md shadow-panel py-1 animate-fade-in"
          role="menu"
        >
          <div className="px-4 py-2 text-xs text-slate-400 truncate">{email}</div>
          <hr className="border-slate-700 my-1" />
          <button
            onClick={() => {
              setOpen(false);
              onLogout();
            }}
            className="w-full flex items-center gap-2 px-4 py-2 text-sm text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
            role="menuitem"
          >
            <LogOut className="h-4 w-4" aria-hidden="true" />
            Sign Out
          </button>
        </div>
      )}
    </div>
  );
}

export default Navbar;
