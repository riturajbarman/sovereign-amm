'use client';

import Link from 'next/link';

interface Tab {
  label: string;
  href: string;
}

interface MobileMenuProps {
  tabs: Tab[];
  currentPath: string;
  /** Called when any menu link is clicked, so the parent can close the menu */
  onClose: () => void;
}

/**
 * MobileMenu — vertical dropdown shown on viewports < 768 px when the
 * hamburger icon is toggled.
 *
 * Requirements: 2.6, 2.7
 */
export function MobileMenu({ tabs, currentPath, onClose }: MobileMenuProps) {
  return (
    <div className="md:hidden bg-slate-900 border-t border-slate-800 animate-slide-down">
      <div className="px-2 pt-2 pb-3 space-y-1">
        {tabs.map((tab) => {
          const isActive =
            currentPath === tab.href ||
            currentPath.startsWith(tab.href + '/');

          return (
            <Link
              key={tab.href}
              href={tab.href}
              onClick={onClose}
              className={`block px-3 py-2 rounded-md text-base font-medium transition-colors ${
                isActive
                  ? 'bg-slate-800 text-white'
                  : 'text-slate-300 hover:bg-slate-700 hover:text-white'
              }`}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
