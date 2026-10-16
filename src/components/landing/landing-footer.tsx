"use client";

import React from "react";
import Link from "next/link";
import { AiWorkspaceLogo } from "@/components/ai-workspace-logo";
import { CheckCircle2, Shield, Terminal, ArrowUpRight } from "lucide-react";

export const LandingFooter: React.FC = () => {
  return (
    <footer className="border-t border-white/[0.08] bg-[#060709] text-zinc-400 text-xs py-14 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Col 1: Brand */}
          <div className="space-y-3 md:col-span-2">
            <Link href="/" className="inline-block">
              <AiWorkspaceLogo size="md" />
            </Link>
            <p className="text-xs text-zinc-500 max-w-sm leading-relaxed">
              One workspace. Every answer, sourced. Built for engineering teams that require deterministic traceability across requirements, ADRs, tasks, and meetings.
            </p>
            <div className="flex items-center gap-2 pt-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-mono text-[10px]">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Phase 2 Quality Gates 100% Passed
              </span>
            </div>
          </div>

          {/* Col 2: Navigation */}
          <div className="space-y-2.5">
            <div className="font-semibold text-zinc-200 text-xs tracking-wider uppercase font-mono">
              Product
            </div>
            <ul className="space-y-2 text-xs">
              <li>
                <a href="#features" className="hover:text-white transition-colors">
                  Features (Bento Grid)
                </a>
              </li>
              <li>
                <a href="#architecture" className="hover:text-white transition-colors">
                  ADR Architecture
                </a>
              </li>
              <li>
                <a href="#workflow" className="hover:text-white transition-colors">
                  Knowledge Graph
                </a>
              </li>
            </ul>
          </div>

          {/* Col 3: Workspace & Auth */}
          <div className="space-y-2.5">
            <div className="font-semibold text-zinc-200 text-xs tracking-wider uppercase font-mono">
              Access
            </div>
            <ul className="space-y-2 text-xs">
              <li>
                <Link href="/login" className="hover:text-white transition-colors flex items-center gap-1">
                  Demo Sign In <ArrowUpRight className="w-3 h-3 text-zinc-500" />
                </Link>
              </li>
              <li>
                <Link href="/assistant" className="hover:text-white transition-colors flex items-center gap-1">
                  Workspace Dashboard <ArrowUpRight className="w-3 h-3 text-zinc-500" />
                </Link>
              </li>
              <li>
                <span className="text-zinc-500 font-mono text-[11px]">
                  Demo Account
                </span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-white/[0.06] flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-zinc-500">
          <div>
            &copy; {new Date().getFullYear()} AI Workspace Inc. All rights reserved.
          </div>
          <div className="text-[11px] text-zinc-500">
            One workspace. Every answer, sourced.
          </div>
        </div>
      </div>
    </footer>
  );
};
