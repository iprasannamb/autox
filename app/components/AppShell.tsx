"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard, Receipt, Wallet, Calculator, Sparkles,
  LogOut, ChevronLeft, ChevronRight, Menu, X, Bell, Search,
} from "lucide-react";

// ── Navigation items ──────────────────────────────────────────────────────────

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  badge?: string;
}

const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard",  href: "/dashboard",  icon: LayoutDashboard },
  { label: "Expenses",   href: "/expenses",   icon: Receipt },
  { label: "Budget",     href: "/budget",      icon: Wallet },
  { label: "Calculator", href: "/calculator",  icon: Calculator },
  { label: "AI Insights", href: "/ai",         icon: Sparkles, badge: "AI" },
];

// ── Desktop sidebar ───────────────────────────────────────────────────────────

function DesktopSidebar({
  collapsed,
  user,
  onSignOut,
}: {
  collapsed: boolean;
  user?: { email?: string; name?: string } | null;
  onSignOut: () => void;
}) {
  const pathname = usePathname();

  return (
    <div className="flex h-full flex-col">
      {/* Logo */}
      <div className={`flex h-[60px] shrink-0 items-center border-b border-[#E2E8F0] ${collapsed ? "justify-center px-3" : "px-5"}`}>
        <Link href="/" className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-sky-400 to-sky-600 shadow-[0_2px_8px_0_rgb(14_165_233/0.3)]">
            <span className="text-sm font-extrabold text-white">X</span>
          </div>
          {!collapsed && (
            <span className="text-[15px] font-extrabold tracking-tight text-[#0D1B2A]">
              auto<span className="text-sky-500">X</span>
            </span>
          )}
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <div className="space-y-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                title={collapsed ? item.label : undefined}
                className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium transition-all duration-150 ${
                  isActive
                    ? "bg-sky-50 text-sky-700 shadow-[inset_0_0_0_1px_rgb(14_165_233/0.15)]"
                    : "text-[#3D5A73] hover:bg-[#F0F4F8] hover:text-[#0D1B2A]"
                } ${collapsed ? "justify-center" : ""}`}
              >
                <Icon
                  size={18}
                  className={`shrink-0 ${isActive ? "text-sky-500" : "text-[#8BA3B8] group-hover:text-[#3D5A73]"}`}
                />
                {!collapsed && (
                  <>
                    <span className="flex-1">{item.label}</span>
                    {item.badge && (
                      <span className="rounded-full bg-sky-100 px-1.5 py-0.5 text-[10px] font-semibold text-sky-600">
                        {item.badge}
                      </span>
                    )}
                  </>
                )}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* User footer */}
      <div className="shrink-0 border-t border-[#E2E8F0] p-3">
        {!collapsed && user && (
          <div className="mb-2 flex items-center gap-2.5 rounded-xl bg-[#F8FAFC] px-3 py-2">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-sky-400 to-sky-600 text-[11px] font-bold text-white">
              {(user.name || user.email || "U").charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="truncate text-xs font-semibold text-[#0D1B2A] capitalize">
                {user.name || user.email?.split("@")[0] || "User"}
              </p>
              <p className="truncate text-[10px] text-[#8BA3B8]">{user.email}</p>
            </div>
          </div>
        )}
        <button
          onClick={onSignOut}
          title={collapsed ? "Sign out" : undefined}
          className={`group flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-[#8BA3B8] transition-all hover:bg-red-50 hover:text-red-500 ${collapsed ? "justify-center" : ""}`}
        >
          <LogOut size={15} />
          {!collapsed && "Sign out"}
        </button>
      </div>
    </div>
  );
}

// ── Mobile bottom tab bar ─────────────────────────────────────────────────────

function MobileBottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-[#E2E8F0] bg-white/95 backdrop-blur-md lg:hidden">
      <div className="flex items-stretch">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`relative flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-medium transition-colors ${
                isActive ? "text-sky-600" : "text-[#8BA3B8]"
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId="bottomNavIndicator"
                  className="absolute top-0 h-[2px] w-8 rounded-full bg-sky-500"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
              <Icon size={20} strokeWidth={isActive ? 2.2 : 1.8} />
              <span>{item.label === "AI Insights" ? "AI" : item.label}</span>
            </Link>
          );
        })}
      </div>
      {/* Safe area padding for iOS */}
      <div className="h-[env(safe-area-inset-bottom)]" />
    </nav>
  );
}

// ── Loading skeleton ──────────────────────────────────────────────────────────

export function PageSkeleton() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F0F4F8]">
      <div className="text-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="mx-auto mb-3 h-8 w-8 rounded-full border-2 border-sky-200 border-t-sky-500"
        />
        <p className="text-xs font-medium text-[#8BA3B8]">Loading autoX…</p>
      </div>
    </div>
  );
}

// ── AppShell ──────────────────────────────────────────────────────────────────

interface AppShellProps {
  children: React.ReactNode;
  user?: { email?: string; name?: string } | null;
  onSignOut?: () => void;
}

export default function AppShell({ children, user, onSignOut }: AppShellProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const pathname = usePathname();

  // Close mobile drawer on navigation
  useEffect(() => {
    setMobileDrawerOpen(false);
  }, [pathname]);

  const handleSignOut = onSignOut || (() => {});

  return (
    <div className="flex min-h-screen bg-[#F0F4F8]">
      {/* ── Desktop sidebar ──────────────────────────────────── */}
      <motion.aside
        animate={{ width: collapsed ? 68 : 240 }}
        transition={{ duration: 0.2, ease: "easeInOut" }}
        className="relative hidden shrink-0 border-r border-[#E2E8F0] bg-white lg:flex lg:flex-col"
        style={{ overflow: "visible" }}
      >
        <DesktopSidebar collapsed={collapsed} user={user} onSignOut={handleSignOut} />

        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed((v) => !v)}
          className="absolute -right-3 top-[68px] z-10 flex h-6 w-6 items-center justify-center rounded-full border border-[#E2E8F0] bg-white text-[#8BA3B8] shadow-sm transition-all hover:border-sky-300 hover:text-sky-500"
          title={collapsed ? "Expand" : "Collapse"}
        >
          {collapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
        </button>
      </motion.aside>

      {/* ── Mobile drawer overlay ────────────────────────────── */}
      <AnimatePresence>
        {mobileDrawerOpen && (
          <>
            <motion.div
              className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[2px] lg:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              onClick={() => setMobileDrawerOpen(false)}
            />
            <motion.aside
              className="fixed inset-y-0 left-0 z-50 w-[260px] border-r border-[#E2E8F0] bg-white shadow-xl lg:hidden"
              initial={{ x: -260 }}
              animate={{ x: 0 }}
              exit={{ x: -260 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
            >
              <DesktopSidebar collapsed={false} user={user} onSignOut={handleSignOut} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* ── Main content ─────────────────────────────────────── */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile top bar */}
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-[#E2E8F0] bg-white px-4 lg:hidden">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileDrawerOpen(true)}
              className="rounded-lg p-1.5 text-[#8BA3B8] hover:bg-[#F0F4F8] hover:text-[#0D1B2A]"
            >
              <Menu size={20} />
            </button>
            <Link href="/" className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-sky-400 to-sky-600">
                <span className="text-xs font-extrabold text-white">X</span>
              </div>
              <span className="text-sm font-extrabold tracking-tight text-[#0D1B2A]">
                auto<span className="text-sky-500">X</span>
              </span>
            </Link>
          </div>
          <div className="flex items-center gap-2">
            <button className="rounded-lg p-1.5 text-[#8BA3B8] hover:bg-[#F0F4F8]">
              <Search size={18} />
            </button>
            <button className="rounded-lg p-1.5 text-[#8BA3B8] hover:bg-[#F0F4F8]">
              <Bell size={18} />
            </button>
          </div>
        </header>

        {/* Page content — extra bottom padding on mobile for bottom nav */}
        <main className="flex-1 overflow-auto pb-20 lg:pb-0">{children}</main>
      </div>

      {/* ── Mobile bottom nav ────────────────────────────────── */}
      <MobileBottomNav />
    </div>
  );
}
