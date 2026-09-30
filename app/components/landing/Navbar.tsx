"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowRight, Menu, X, Sparkles } from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navLinks = [
    { label: "The Problem", href: "#story" },
    { label: "Features", href: "#features" },
    { label: "autoX AI", href: "#ai-engine" },
    { label: "Calculator", href: "/calculator" },
    { label: "Social Proof", href: "#proof" },
  ];

  return (
    <header
      className={`sticky top-0 z-50 transition-all duration-300 ${
        scrolled
          ? "border-b border-[var(--border)] bg-[var(--background)]/85 backdrop-blur-md shadow-sm"
          : "border-b border-transparent bg-transparent"
      }`}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand Logo */}
        <Link href="/" className="group flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-sky-400 to-sky-600 shadow-[0_2px_10px_0_rgba(14,165,233,0.35)] transition-transform duration-200 group-hover:scale-105">
            <span className="text-base font-black text-white">X</span>
          </div>
          <span className="text-lg font-black tracking-tight text-[var(--text-primary)]">
            auto<span className="text-[var(--accent)]">X</span>
          </span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-1 rounded-full border border-[var(--border)] bg-[var(--surface)]/70 px-4 py-1.5 backdrop-blur-md shadow-xs">
          {navLinks.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              className="rounded-full px-3.5 py-1 text-sm font-medium text-[var(--text-secondary)] transition-colors duration-150 hover:text-[var(--text-primary)] hover:bg-[var(--accent-subtle)]"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Right Actions */}
        <div className="hidden md:flex items-center gap-3">
          <ThemeToggle />

          <Link
            href="/signin"
            className="px-3.5 py-2 text-sm font-medium text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
          >
            Sign In
          </Link>

          {/* Cobalt-inspired Glowing Pill Button */}
          <Link
            id="nav-get-started"
            href="/signup"
            className="group relative inline-flex items-center gap-2 overflow-hidden rounded-full p-[1px] text-sm font-semibold transition-all duration-300 hover:shadow-[0_0_24px_rgba(56,189,248,0.45)]"
          >
            {/* Glowing animated border gradient */}
            <span className="absolute inset-0 rounded-full bg-gradient-to-r from-sky-500 via-cyan-400 to-sky-500 opacity-90 transition-opacity duration-300 group-hover:opacity-100" />
            <div className="relative inline-flex items-center gap-2 rounded-full bg-[var(--surface)] dark:bg-slate-950 px-4 py-1.5 text-xs sm:text-sm font-semibold text-[var(--text-primary)] dark:text-white transition-colors group-hover:bg-transparent group-hover:text-white">
              <span>Start Free</span>
              <ArrowRight strokeWidth={1.5} className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5" />
            </div>
          </Link>
        </div>

        {/* Mobile controls */}
        <div className="flex md:hidden items-center gap-2">
          <ThemeToggle />
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)]"
          >
            {mobileMenuOpen ? <X strokeWidth={1.5} className="h-5 w-5" /> : <Menu strokeWidth={1.5} className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-[var(--border)] bg-[var(--surface)] px-4 py-5 shadow-xl transition-all">
          <nav className="flex flex-col space-y-2">
            {navLinks.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className="rounded-lg px-3 py-2 text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--accent-subtle)] hover:text-[var(--text-primary)]"
              >
                {link.label}
              </Link>
            ))}
            <div className="pt-3 border-t border-[var(--border)] flex flex-col gap-2">
              <Link
                href="/signin"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full text-center py-2.5 text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              >
                Sign In
              </Link>
              <Link
                href="/signup"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--accent)] py-2.5 text-sm font-semibold text-white shadow-md"
              >
                <span>Start Free</span>
                <ArrowRight strokeWidth={1.5} className="h-4 w-4" />
              </Link>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
