"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import Avatar from "./ui/Avatar";
import Badge from "./ui/Badge";
import { buttonClass } from "./ui/Button";
import {
  HomeIcon, UsersIcon, FileIcon, SettingsIcon, LogOutIcon, MenuIcon, CloseIcon, ShieldIcon,
} from "./ui/Icons";
import { ROLE_LABEL } from "@/lib/format";

interface NavItem { href: string; label: string; icon: React.ReactNode; adminOnly?: boolean; }

const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: <HomeIcon /> },
  { href: "/teams", label: "Teams", icon: <UsersIcon /> },
  { href: "/documents", label: "Documents", icon: <FileIcon /> },
  { href: "/admin", label: "Admin", icon: <SettingsIcon />, adminOnly: true },
];

export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <span className="grid h-7 w-7 place-items-center rounded-lg bg-sui-600 text-sm text-white shadow-sm shadow-sui-600/30">
        <ShieldIcon />
      </span>
      <span className="text-base font-semibold tracking-tight text-sui-950">Attest</span>
    </span>
  );
}

export default function NavBar() {
  const { user, logout, loading } = useAuth();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Any navigation should leave both menus closed. Adjusting during render is
  // React's documented pattern for deriving state from a changed value — an
  // effect here would render the stale open menu for a frame first.
  const [lastPath, setLastPath] = useState(pathname);
  if (pathname !== lastPath) {
    setLastPath(pathname);
    setMenuOpen(false);
    setMobileOpen(false);
  }

  useEffect(() => {
    if (!menuOpen) return;
    function onClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    }
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") setMenuOpen(false); }
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  const items = NAV_ITEMS.filter((i) => !i.adminOnly || user?.role === "ADMIN");
  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <header className="sticky top-0 z-40 border-b border-ink-200 bg-white/85 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-4 sm:px-6">
        <Link href={user ? "/dashboard" : "/"} aria-label="Attest home">
          <Wordmark />
        </Link>

        {user && (
          <nav aria-label="Main" className="ml-4 hidden items-center gap-1 md:flex">
            {items.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive(item.href) ? "page" : undefined}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                  isActive(item.href)
                    ? "bg-sui-50 text-sui-700"
                    : "text-ink-600 hover:bg-ink-100 hover:text-ink-900"
                }`}
              >
                <span className="text-base">{item.icon}</span>
                {item.label}
              </Link>
            ))}
          </nav>
        )}

        <div className="ml-auto flex items-center gap-2">
          {loading ? (
            <div className="skeleton h-8 w-8 rounded-full" />
          ) : user ? (
            <>
              <div className="relative" ref={menuRef}>
                <button
                  onClick={() => setMenuOpen((o) => !o)}
                  aria-haspopup="menu"
                  aria-expanded={menuOpen}
                  aria-label="Account menu"
                  className="flex items-center gap-2 rounded-full p-0.5 transition-colors hover:bg-ink-100"
                >
                  <Avatar email={user.email} />
                </button>

                {menuOpen && (
                  <div
                    role="menu"
                    className="animate-rise absolute right-0 mt-2 w-60 overflow-hidden rounded-xl border border-ink-200 bg-white shadow-lg shadow-ink-900/10"
                  >
                    <div className="border-b border-ink-100 px-4 py-3">
                      <p className="truncate text-sm font-medium text-ink-900">{user.email}</p>
                      <div className="mt-1.5 flex items-center gap-2">
                        <Badge tone={user.role === "ADMIN" ? "blue" : "neutral"}>
                          {ROLE_LABEL[user.role] ?? user.role}
                        </Badge>
                        <span className="text-[11px] text-ink-400">user id {user.id}</span>
                      </div>
                    </div>
                    <button
                      role="menuitem"
                      onClick={logout}
                      className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-ink-700 transition-colors hover:bg-ink-50"
                    >
                      <LogOutIcon className="text-base text-ink-400" />
                      Log out
                    </button>
                  </div>
                )}
              </div>

              <button
                onClick={() => setMobileOpen((o) => !o)}
                aria-label={mobileOpen ? "Close navigation" : "Open navigation"}
                aria-expanded={mobileOpen}
                className="grid h-9 w-9 place-items-center rounded-lg text-ink-600 transition-colors hover:bg-ink-100 md:hidden"
              >
                {mobileOpen ? <CloseIcon className="text-lg" /> : <MenuIcon className="text-lg" />}
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className={buttonClass("ghost", "sm")}>Log in</Link>
              <Link href="/register" className={buttonClass("primary", "sm")}>Get started</Link>
            </>
          )}
        </div>
      </div>

      {user && mobileOpen && (
        <nav aria-label="Main" className="animate-rise border-t border-ink-200 bg-white px-4 py-2 md:hidden">
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive(item.href) ? "page" : undefined}
              className={`flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                isActive(item.href) ? "bg-sui-50 text-sui-700" : "text-ink-700 hover:bg-ink-100"
              }`}
            >
              <span className="text-base">{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}
