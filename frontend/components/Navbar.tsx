"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [role, setRole] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    // Fetch current user from /api/auth/me
    fetch("http://127.0.0.1:8000/api/auth/me", {
      headers: { "Content-Type": "application/json" },
    })
      .then((res) => {
        if (res.ok) {
          return res.json();
        }
        throw new Error("Not logged in");
      })
      .then((data) => {
        setRole(data.role);
        setEmail(data.email);
      })
      .catch(() => {
        setRole(null);
        setEmail(null);
      });
  }, [pathname]); // Re-fetch on navigation

  const handleLogout = async () => {
    await fetch("http://127.0.0.1:8000/api/auth/logout", { method: "POST" });
    setRole(null);
    setEmail(null);
    router.push("/login");
  };

  const navItems = [
    { label: "Dashboard", href: "/", roles: ["admin", "grid_operator", "battery_operator", "market_participant", "viewer"] },
    { label: "Market", href: "/market", roles: ["admin", "grid_operator", "battery_operator", "market_participant", "viewer"] },
    { label: "Pricing", href: "/pricing", roles: ["admin", "grid_operator", "battery_operator", "market_participant", "viewer"] },
    { label: "Battery", href: "/battery", roles: ["admin", "grid_operator", "battery_operator", "viewer"] },
    { label: "Grid", href: "/grid", roles: ["admin", "grid_operator", "viewer"] },
    { label: "Account", href: "/account", roles: ["market_participant"] },
    { label: "Admin", href: "/admin", roles: ["admin"] },
    { label: "System", href: "/system", roles: ["admin", "grid_operator", "battery_operator", "viewer"] },
  ];

  return (
    <nav className="bg-surface border-b border-border shadow-sm flex items-center justify-between px-6 py-4">
      <div className="flex items-center space-x-6">
        <Link href="/" className="text-xl font-outfit font-bold text-accent">
          Sovereign-AMM
        </Link>
        <div className="hidden md:flex space-x-4">
          {navItems.map(
            (item) =>
              role && item.roles.includes(role) && (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`text-sm font-medium px-3 py-2 rounded-md transition-colors ${
                    pathname === item.href
                      ? "bg-accent/10 text-accent"
                      : "text-textMuted hover:text-textMain hover:bg-surfaceHighlight"
                  }`}
                >
                  {item.label}
                </Link>
              )
          )}
        </div>
      </div>
      <div className="flex items-center space-x-4">
        {role ? (
          <>
            <span className="text-sm text-textMuted">{email} ({role})</span>
            <button
              onClick={handleLogout}
              className="text-sm font-medium text-red-500 hover:text-red-400"
            >
              Logout
            </button>
          </>
        ) : (
          <Link
            href="/login"
            className="text-sm font-medium bg-accent text-bg px-4 py-2 rounded-md hover:bg-accent/90 transition-colors"
          >
            Login / Signup
          </Link>
        )}
      </div>
    </nav>
  );
}
