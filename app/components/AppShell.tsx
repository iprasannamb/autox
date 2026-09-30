"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";
import {
  LayoutDashboard, Receipt, TrendingUp, Calculator, Sparkles,
  LogOut, ChevronRight, ChevronLeft, Menu, X,
} from "lucide-react";

// ── Navigation config (auto-derived from actual app routes + tabs) ────────────

interface NavChild { label: string; href: string; tab?: string }

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  badge?: string;
  children?: NavChild[];
}

const NAV: NavItem[] = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    children: [
      { label: "Home",             href: "/dashboard", tab: "home" },
      { label: "Expenses",         href: "/dashboard", tab: "expenses" },
      { label: "Projections",      href: "/dashboard", tab: "chart" },
    ],
  },
  {
    label: "Calculator",
    href: "/calculator",
    icon: Calculator,
  },
  {
    label: "AI Features",
    href: "/dashboard",
    icon: Sparkles,
    badge: "AI",
    children: [
      { label: "Smart Classifier", href: "/dashboard", tab: "ai" },
      { label: "What-If Analyzer", href: "/dashboard", tab: "ai" },
      { label: "Weekly Digest",    href: "/dashboard", tab: "ai" },
    ],
  },
];

// ── NavLink ───────────────────────────────────────────────────────────────────

function NavLink({
  item, collapsed, activeTab, onTabChange,
}: {
  item: NavItem;
  collapsed: boolean;
  activeTab?: string;
  onTabChange?: (tab: string) => void;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(() => !!item.children && pathname.startsWith(item.href));
  const isActive       = pathname === item.href && !item.children;
  const isParentActive = !!item.children && pathname.startsWith(item.href);
  const Icon = item.icon;

  return (
    <div>
      {item.children ? (
        <button
          onClick={() => setOpen((v) => !v)}
          title={collapsed ? item.label : undefined}
          className={`group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-150 ${
            isParentActive
              ? "bg-sky-50 text-sky-700"
              : "text-[#3D5A73] hover:bg-[#EBF0F5] hover:text-[#0D1B2A]"
          }`}
        >
          <Icon size={16} className={`shrink-0 ${isParentActive ? "text-sky-500" : "text-[#8BA3B8] group-hover:text-[#3D5A73]"}`} />
          {!collapsed && (
            <>
              <span className="flex-1 text-left">{item.label}</span>
              {item.badge && (
                <span className="rounded-full bg-sky-100 px-1.5 py-0.5 text-[10px] font-semibold text-sky-600">{item.badge}</span>
              )}
              <ChevronRight size={12} className={`text-[#8BA3B8] transition-transform duration-200 ${open ? "rotate-90" : ""}`} />
            </>
          )}
        </button>
      ) : (
        <Link
          href={item.href}
          title={collapsed ? item.label : undefined}
          className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-150 ${
            isActive
              ? "bg-sky-50 text-sky-700"
              : "text-[#3D5A73] hover:bg-[#EBF0F5] hover:text-[#0D1B2A]"
          }`}
        >
          <Icon size={16} className={`shrink-0 ${isActive ? "text-sky-500" : "text-[#8BA3B8] group-hover:text-[#3D5A73]"}`} />
          {!collapsed && <span className="flex-1">{item.label}</span>}
        </Link>
      )}

      {/* Children */}
      <AnimatePresence initial={false}>
        {item.children && open && !collapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="ml-8 mt-0.5 space-y-0.5 border-l border-[#DDE5EE] pl-3">
              {item.children.map((child) => {
                const childActive = usePathname() === child.href && child.tab === activeTab;
                return (
                  <button
                    key={child.label}
                    onClick={() => { if (child.tab && onTabChange) onTabChange(child.tab); }}
                    className={`block w-full rounded-lg px-2 py-1.5 text-left text-xs transition-all ${
                      childActive
                        ? "font-semibold text-sky-600"
                        : "text-[#8BA3B8] hover:text-[#0D1B2A]"
                    }`}
                  >
                    {child.label}
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Sidebar ───────────────────────────────────────────────────────────────────

function Sidebar({
  collapsed, user, onSignOut, activeTab, onTabChange,
}: {
  collapsed: boolean;
  user?: { email?: string } | null;
  onSignOut: () => void;
  activeTab?: string;
  onTabChange?: (tab: string) => void;
}) {
  return (
    <div className="flex h-full flex-col">
      {/* Logo */}
      <div className={`flex h-14 shrink-0 items-center border-b border-[#DDE5EE] ${collapsed ? "justify-center px-3" : "px-5"}`}>
        <Link href="/" className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-sky-500 shadow-[0_2px_8px_0_rgb(14_165_233/0.3)]">
            <span className="text-sm font-extrabold text-white">X</span>
          </div>
          {!collapsed && (
            <span className="text-base font-extrabold tracking-tight text-[#0D1B2A]">
              auto<span className="text-sky-500">X</span>
            </span>
          )}
        </Link>
      </div>

      {/* Nav items */}
      <nav className="flex-1 overflow-y-auto px-2 py-3">
        <div className="space-y-0.5">
          {NAV.map((item) => (
            <NavLink
              key={item.label}
              item={item}
              collapsed={collapsed}
              activeTab={activeTab}
              onTabChange={onTabChange}
            />
          ))}
        </div>
      </nav>

      {/* User footer */}
      <div className="shrink-0 border-t border-[#DDE5EE] p-2">
        {!collapsed && user?.email && (
          <p className="mb-1.5 truncate px-2 text-[11px] text-[#8BA3B8]">{user.email}</p>
        )}
        <button
          id="btn-signout"
          onClick={onSignOut}
          title={collapsed ? "Sign out" : undefined}
          className={`group flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-[#8BA3B8] transition-all hover:bg-red-50 hover:text-red-500 ${collapsed ? "justify-center" : ""}`}
        >
          <LogOut size={14} />
          {!collapsed && "Sign out"}
        </button>
      </div>
    </div>
  );
}

// ── AppShell ──────────────────────────────────────────────────────────────────

interface AppShellProps {
  children: React.ReactNode;
  user?: { email?: string } | null;
  activeTab?: string;
  onTabChange?: (tab: string) => void;
}

export default function AppShell({ children, user, activeTab, onTabChange }: AppShellProps) {
  const router = useRouter();
  const [collapsed, setCollapsed]     = useState(false);
  const [mobileOpen, setMobileOpen]   = useState(false);
  const pathname = usePathname();

  useEffect(() => { setMobileOpen(false); }, [pathname]);

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/signin");
  }

  const sidebarProps = { collapsed, user, onSignOut: handleSignOut, activeTab, onTabChange };

  return (
    <div className="flex min-h-screen bg-[#F0F4F8]">
      {/* Desktop sidebar */}
      <motion.aside
        animate={{ width: collapsed ? 64 : 240 }}
        transition={{ duration: 0.22, ease: "easeInOut" }}
        className="relative hidden shrink-0 border-r border-[#DDE5EE] bg-white lg:flex lg:flex-col"
        style={{ overflow: "visible" }}
      >
        <Sidebar {...sidebarProps} />

        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed((v) => !v)}
          className="absolute -right-3.5 top-[54px] z-10 flex h-7 w-7 items-center justify-center rounded-full border border-[#DDE5EE] bg-white text-[#8BA3B8] shadow-sm transition-all hover:border-sky-300 hover:text-sky-500"
          title={collapsed ? "Expand" : "Collapse"}
        >
          {collapsed ? <ChevronRight size={13} /> : <ChevronLeft size={13} />}
        </button>
      </motion.aside>

      {/* Mobile sidebar */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[2px] lg:hidden"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}
              onClick={() => setMobileOpen(false)} />
            <motion.aside
              className="fixed inset-y-0 left-0 z-50 w-60 border-r border-[#DDE5EE] bg-white shadow-xl lg:hidden"
              initial={{ x: -240 }} animate={{ x: 0 }} exit={{ x: -240 }} transition={{ duration: 0.22, ease: "easeOut" }}>
              <Sidebar {...sidebarProps} collapsed={false} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main content */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile topbar */}
        <header className="flex h-14 shrink-0 items-center border-b border-[#DDE5EE] bg-white px-4 lg:hidden">
          <button onClick={() => setMobileOpen(true)} className="mr-3 rounded-xl p-2 text-[#8BA3B8] hover:bg-[#F0F4F8]">
            {mobileOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-sky-500">
              <span className="text-xs font-extrabold text-white">X</span>
            </div>
            <span className="text-sm font-extrabold tracking-tight text-[#0D1B2A]">auto<span className="text-sky-500">X</span></span>
          </Link>
        </header>

        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
