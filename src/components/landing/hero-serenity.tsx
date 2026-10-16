"use client";

import React, { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Meteors } from "./meteors";
import { TextReveal } from "./text-reveal";
import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  Sparkles,
  ShieldCheck,
  Zap,
  Layers,
  ChevronRight,
  Terminal,
  FileText,
  GitCommit,
  CheckCircle2,
  Database,
  Cpu,
  Clock,
} from "lucide-react";
import { ContinuumMark } from "@/components/continuum-logo";

export const HeroSerenity: React.FC = () => {
  const [activeTab, setActiveTab] = useState<"copilot" | "specs" | "decisions" | "tasks">("copilot");

  return (
    <section className="relative flex flex-col items-center justify-center text-center px-4 sm:px-6 lg:px-8 pt-16 pb-24 overflow-hidden bg-[#08090a]">
      <Meteors number={25} />

      {/* Radial Gradient Ambient Lighting */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[380px] bg-gradient-to-r from-cyan-500/15 via-indigo-600/15 to-purple-600/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute top-1/3 left-1/3 w-[350px] h-[250px] bg-blue-600/10 rounded-full blur-[100px] pointer-events-none" />

      {/* Modern Capsule Pill with Magic UI shimmer border */}
      <div className="relative inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-white/10 bg-white/[0.04] text-xs font-medium mb-8 backdrop-blur-md hover:border-white/20 transition-colors shadow-[0_0_20px_rgba(0,242,254,0.1)]">
        <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
        <span className="text-zinc-300 font-mono text-[11px]">
          Continuum 2.0 • Phase 2 Grounded AI & Vector Engine Live
        </span>
        <ChevronRight className="w-3 h-3 text-zinc-500" />
      </div>

      {/* Main Headline with tight tracking */}
      <div className="max-w-4xl mx-auto space-y-4">
        <h1 className="text-4xl sm:text-6xl lg:text-7xl font-bold tracking-[-0.03em] text-white leading-[1.1]">
          Unified Intelligence for <br className="hidden sm:inline" />
          <span className="bg-gradient-to-r from-[#00F2FE] via-[#4FACFE] to-[#6366F1] bg-clip-text text-transparent">
            Modern Engineering Teams
          </span>
        </h1>

        <p className="max-w-2xl mx-auto text-sm sm:text-base text-zinc-400 pt-2 leading-relaxed">
          Ground every requirement, architectural decision, task, and meeting transcript in a single high-integrity workspace with deterministic citations and zero hallucinations.
        </p>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap items-center justify-center gap-3.5 mt-8">
        <Link href="/assistant">
          <button className="relative inline-flex items-center justify-center gap-2 px-6 py-3 text-xs font-semibold text-white bg-gradient-to-r from-[#00F2FE] via-[#4361EE] to-[#6366F1] rounded-full shadow-[0_0_25px_rgba(67,97,238,0.4)] hover:shadow-[0_0_35px_rgba(67,97,238,0.6)] hover:scale-[1.02] transition-all">
            <span>Launch Workspace</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </Link>
        <Link href="/login">
          <button className="px-5 py-3 text-xs font-medium text-zinc-300 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.1] rounded-full transition-all">
            Demo Account
          </button>
        </Link>
      </div>

      {/* Live Workspace Preview Window */}
      <div className="w-full max-w-4xl mx-auto mt-14 rounded-2xl border border-white/[0.1] bg-[#0d0e13]/90 p-2 shadow-[0_0_50px_rgba(0,0,0,0.8)] backdrop-blur-2xl">
        <div className="rounded-xl border border-white/[0.05] bg-[#090a0f] p-4 text-left overflow-hidden">
          {/* Window Chrome Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-white/[0.06] pb-3 mb-4 gap-2">
            <div className="flex items-center gap-2.5">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-500/80" />
                <div className="w-3 h-3 rounded-full bg-amber-500/80" />
                <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
              </div>
              <div className="h-4 w-px bg-white/10 mx-1" />
              <div className="flex items-center gap-2">
                <ContinuumMark className="w-4 h-4" />
                <span className="text-xs font-semibold text-zinc-300 font-mono">
                  ai-workspace / phoenix-core
                </span>
              </div>
            </div>

            {/* Simulated Tabs */}
            <div className="flex items-center gap-1 bg-white/[0.03] p-1 rounded-lg border border-white/[0.05] text-[11px]">
              {(
                [
                  { id: "copilot", label: "AI Copilot", icon: Sparkles },
                  { id: "specs", label: "Specs", icon: FileText },
                  { id: "decisions", label: "ADRs", icon: GitCommit },
                  { id: "tasks", label: "Tasks", icon: CheckCircle2 },
                ] as const
              ).map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-all font-medium ${
                      activeTab === tab.id
                        ? "bg-white/10 text-white shadow-sm"
                        : "text-zinc-400 hover:text-zinc-200"
                    }`}
                  >
                    <Icon className="w-3 h-3" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Tab Content Display */}
          {activeTab === "copilot" && (
            <div className="space-y-3 py-1">
              <div className="flex items-start gap-2.5 justify-end">
                <div className="bg-[#1a1c28] border border-indigo-500/30 rounded-2xl rounded-tr-xs px-3.5 py-2 text-xs text-zinc-200 max-w-md">
                  What are our architectural requirements for token revocation and user sessions?
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Sparkles className="w-3.5 h-3.5" />
                </div>
                <div className="space-y-2 flex-1">
                  <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl rounded-tl-xs p-3.5 text-xs text-zinc-300 leading-relaxed">
                    According to{" "}
                    <span className="font-mono text-cyan-300 bg-cyan-500/10 px-1.5 py-0.5 rounded border border-cyan-500/20">
                      [AIW-REQ-1 §2.1]
                    </span>{" "}
                    and decision{" "}
                    <span className="font-mono text-indigo-300 bg-indigo-500/10 px-1.5 py-0.5 rounded border border-indigo-500/20">
                      [AIW-DEC-1 §Security]
                    </span>
                    , sessions use opaque cryptographically random cookies stored in PostgreSQL. Revocation immediately invalidates the server-side record, guaranteeing zero residual access.
                  </div>
                  <div className="flex items-center gap-2 text-[10px] font-mono text-emerald-400">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Sources: 2 verified project artifacts • Confidence: 100%</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "specs" && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 py-1">
              <div className="p-3.5 rounded-lg border border-white/[0.06] bg-white/[0.02]">
                <div className="text-[11px] font-mono text-indigo-400">AIW-REQ-1</div>
                <div className="text-xs font-semibold text-zinc-200 mt-1">Biometric Authentication</div>
                <div className="text-[10px] text-zinc-500 mt-1">Status: APPROVED • Rev 2</div>
              </div>
              <div className="p-3.5 rounded-lg border border-white/[0.06] bg-white/[0.02]">
                <div className="text-[11px] font-mono text-indigo-400">AIW-REQ-2</div>
                <div className="text-xs font-semibold text-zinc-200 mt-1">Multi-Entity Search Engine</div>
                <div className="text-[10px] text-zinc-500 mt-1">Status: APPROVED • Rev 1</div>
              </div>
              <div className="p-3.5 rounded-lg border border-white/[0.06] bg-white/[0.02]">
                <div className="text-[11px] font-mono text-indigo-400">AIW-REQ-3</div>
                <div className="text-xs font-semibold text-zinc-200 mt-1">Role-Based Project Isolation</div>
                <div className="text-[10px] text-zinc-500 mt-1">Status: IN_REVIEW • Rev 3</div>
              </div>
            </div>
          )}

          {activeTab === "decisions" && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 py-1">
              <div className="p-3.5 rounded-lg border border-white/[0.06] bg-white/[0.02]">
                <div className="text-[11px] font-mono text-purple-400">AIW-DEC-1</div>
                <div className="text-xs font-semibold text-zinc-200 mt-1">PostgreSQL &amp; pgvector Store</div>
                <div className="text-[10px] text-zinc-500 mt-1">Status: ACCEPTED • 0 Cycles</div>
              </div>
              <div className="p-3.5 rounded-lg border border-white/[0.06] bg-white/[0.02]">
                <div className="text-[11px] font-mono text-purple-400">AIW-DEC-2</div>
                <div className="text-xs font-semibold text-zinc-200 mt-1">Argon2id Hash Function</div>
                <div className="text-[10px] text-zinc-500 mt-1">Status: ACCEPTED • OWASP Compliant</div>
              </div>
              <div className="p-3.5 rounded-lg border border-white/[0.06] bg-white/[0.02]">
                <div className="text-[11px] font-mono text-purple-400">AIW-DEC-3</div>
                <div className="text-xs font-semibold text-zinc-200 mt-1">Explicit Release Migrations</div>
                <div className="text-[10px] text-zinc-500 mt-1">Status: ACCEPTED • Zero Sync</div>
              </div>
            </div>
          )}

          {activeTab === "tasks" && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 py-1">
              <div className="p-3.5 rounded-lg border border-white/[0.06] bg-white/[0.02]">
                <div className="text-[11px] font-mono text-emerald-400">AIW-TSK-1</div>
                <div className="text-xs font-semibold text-zinc-200 mt-1">Run PostgreSQL Migrations</div>
                <div className="text-[10px] text-emerald-400 mt-1">Progress: 100% DONE</div>
              </div>
              <div className="p-3.5 rounded-lg border border-white/[0.06] bg-white/[0.02]">
                <div className="text-[11px] font-mono text-cyan-400">AIW-TSK-2</div>
                <div className="text-xs font-semibold text-zinc-200 mt-1">Wire CSRF Protection</div>
                <div className="text-[10px] text-cyan-400 mt-1">Progress: 75% IN_PROGRESS</div>
              </div>
              <div className="p-3.5 rounded-lg border border-white/[0.06] bg-white/[0.02]">
                <div className="text-[11px] font-mono text-amber-400">AIW-TSK-3</div>
                <div className="text-xs font-semibold text-zinc-200 mt-1">Bangkok Overdue Task Check</div>
                <div className="text-[10px] text-amber-400 mt-1">Progress: 50% IN_PROGRESS</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};
