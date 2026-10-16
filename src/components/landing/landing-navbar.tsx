"use client";

import React, { useState } from "react";
import Link from "next/link";
import { AiWorkspaceLogo } from "@/components/ai-workspace-logo";
import { Button } from "@/components/ui/button";
import { ArrowRight, Menu, X, Sparkles } from "lucide-react";

export const LandingNavbar: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full backdrop-blur-xl bg-[#08090a]/85 border-b border-white/[0.08] transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand Logo */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <AiWorkspaceLogo size="md" />
        </Link>

        {/* Desktop Nav Links */}
        <nav className="hidden md:flex items-center gap-1 bg-white/[0.03] border border-white/[0.08] px-3 py-1.5 rounded-full backdrop-blur-md">
          <a
            href="#features"
            className="px-3 py-1 text-xs font-medium text-zinc-400 hover:text-white rounded-full hover:bg-white/[0.06] transition-colors"
          >
            Features
          </a>
          <a
            href="#architecture"
            className="px-3 py-1 text-xs font-medium text-zinc-400 hover:text-white rounded-full hover:bg-white/[0.06] transition-colors"
          >
            Architecture
          </a>
          <a
            href="#workflow"
            className="px-3 py-1 text-xs font-medium text-zinc-400 hover:text-white rounded-full hover:bg-white/[0.06] transition-colors"
          >
            Knowledge Graph
          </a>
        </nav>

        {/* Right Actions */}
        <div className="hidden sm:flex items-center gap-3">
          <Link
            href="/login"
            className="text-xs font-medium text-zinc-400 hover:text-white px-3 py-2 transition-colors"
          >
            Sign In
          </Link>
          <Link href="/assistant">
            <button className="relative inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-gradient-to-r from-[#00F2FE] via-[#4361EE] to-[#6366F1] rounded-full shadow-[0_0_20px_rgba(67,97,238,0.35)] hover:shadow-[0_0_25px_rgba(67,97,238,0.5)] hover:scale-[1.02] transition-all">
              <span>Open Workspace</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </Link>
        </div>

        {/* Mobile Menu Button */}
        <div className="flex md:hidden">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 text-zinc-400 hover:text-white rounded-lg hover:bg-white/5"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-white/[0.08] bg-[#0c0d12] px-4 py-4 space-y-3">
          <a
            href="#features"
            onClick={() => setMobileMenuOpen(false)}
            className="block text-xs font-medium text-zinc-300 py-1.5"
          >
            Features
          </a>
          <a
            href="#architecture"
            onClick={() => setMobileMenuOpen(false)}
            className="block text-xs font-medium text-zinc-300 py-1.5"
          >
            Architecture
          </a>
          <a
            href="#workflow"
            onClick={() => setMobileMenuOpen(false)}
            className="block text-xs font-medium text-zinc-300 py-1.5"
          >
            Knowledge Graph
          </a>
          <div className="pt-2 border-t border-white/[0.06] flex flex-col gap-2">
            <Link
              href="/login"
              className="text-xs font-medium text-center text-zinc-300 py-2 rounded-lg bg-white/5"
            >
              Sign In
            </Link>
            <Link
              href="/assistant"
              className="text-xs font-semibold text-center text-white py-2 rounded-lg bg-[#4361EE]"
            >
              Open Workspace
            </Link>
          </div>
        </div>
      )}
    </header>
  );
};
