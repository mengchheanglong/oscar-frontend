"use client";

import React from "react";
import { motion } from "framer-motion";
import {
  FileText,
  GitCommit,
  Users,
  FileCheck,
  Database,
  Sparkles,
  CheckCircle2,
  ArrowRight,
  Cpu,
  Layers,
} from "lucide-react";
import { ContinuumMark } from "@/components/continuum-logo";

export const ConnectedPipeline: React.FC = () => {
  return (
    <section id="workflow" className="relative py-24 px-4 sm:px-6 lg:px-8 bg-[#090a0f] border-t border-white/[0.06] overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[300px] bg-cyan-500/5 rounded-full blur-[140px] pointer-events-none" />

      <div className="max-w-6xl mx-auto space-y-16">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5 }}
          className="text-center space-y-3 max-w-2xl mx-auto"
        >
          <span className="text-[11px] font-mono tracking-widest uppercase text-cyan-400">
            Unified Knowledge Graph
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-white">
            Connected Knowledge Architecture
          </h2>
          <p className="text-xs sm:text-sm text-zinc-400">
            Raw documentation, architectural decisions, and meeting transcripts continuously sync into a single ACID relational &amp; vector model.
          </p>
        </motion.div>

        {/* Pipeline Architecture Diagram */}
        <div className="relative p-6 sm:p-10 rounded-2xl border border-white/[0.08] bg-[#0d0e13]/80 backdrop-blur-xl">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-center">
            {/* Left Column: Ingestion Sources */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.5 }}
              className="space-y-3"
            >
              <div className="text-[11px] font-mono uppercase text-zinc-400 flex items-center gap-1.5 pb-1">
                <Layers className="w-3.5 h-3.5 text-indigo-400" />
                <span>Input Sources (Project Scoped)</span>
              </div>

              <div className="p-3.5 rounded-xl border border-white/[0.06] bg-white/[0.02] flex items-center justify-between hover:border-indigo-500/30 transition-all">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-zinc-200">Versioned Requirements</div>
                    <div className="text-[10px] text-zinc-500 font-mono">Revisions &amp; Approvals</div>
                  </div>
                </div>
                <span className="text-[10px] font-mono text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded">REQ</span>
              </div>

              <div className="p-3.5 rounded-xl border border-white/[0.06] bg-white/[0.02] flex items-center justify-between hover:border-purple-500/30 transition-all">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center">
                    <GitCommit className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-zinc-200">Architectural Decisions (ADR)</div>
                    <div className="text-[10px] text-zinc-500 font-mono">Cycle-Free DAG Graph</div>
                  </div>
                </div>
                <span className="text-[10px] font-mono text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded">ADR</span>
              </div>

              <div className="p-3.5 rounded-xl border border-white/[0.06] bg-white/[0.02] flex items-center justify-between hover:border-emerald-500/30 transition-all">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                    <Users className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-zinc-200">Meeting Notes &amp; Audio</div>
                    <div className="text-[10px] text-zinc-500 font-mono">Task Draft Extractions</div>
                  </div>
                </div>
                <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">MTG</span>
              </div>

              <div className="p-3.5 rounded-xl border border-white/[0.06] bg-white/[0.02] flex items-center justify-between hover:border-amber-500/30 transition-all">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center">
                    <FileCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-zinc-200">Magic-Byte Verified Files</div>
                    <div className="text-[10px] text-zinc-500 font-mono">SHA-256 Digest Signatures</div>
                  </div>
                </div>
                <span className="text-[10px] font-mono text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded">DOC</span>
              </div>
            </motion.div>

            {/* Center Column: Continuum Engine (Concept 3 Kinetic Facet) */}
            <motion.div
              initial={{ opacity: 0, scale: 0.85 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.5, delay: 0.15 }}
              className="flex flex-col items-center justify-center py-6 px-4"
            >
              <div className="relative group">
                {/* Glowing Outer Rings */}
                <div className="absolute -inset-4 bg-gradient-to-r from-cyan-500 to-indigo-600 rounded-full blur-xl opacity-30 group-hover:opacity-60 transition-all" />
                
                <div className="relative w-28 h-28 rounded-2xl bg-[#12131c] border border-cyan-500/40 p-3 shadow-[0_0_40px_rgba(0,242,254,0.2)] flex flex-col items-center justify-center gap-2">
                  <ContinuumMark className="w-12 h-12" />
                  <span className="text-[10px] font-mono text-cyan-300 font-semibold tracking-wider">
                    AI WORKSPACE
                  </span>
                </div>
              </div>

              <div className="mt-6 text-center space-y-1">
                <div className="text-xs font-semibold text-white">PostgreSQL &amp; pgvector Core</div>
                <div className="text-[11px] text-zinc-400 font-mono">ACID Hybrid Transactions</div>
              </div>

              {/* Animated pulse indicator */}
              <div className="mt-4 flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-mono text-emerald-400">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                <span>Deterministic Verification Active</span>
              </div>
            </motion.div>

            {/* Right Column: Execution & Consumer Outputs */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="space-y-3"
            >
              <div className="text-[11px] font-mono uppercase text-zinc-400 flex items-center gap-1.5 pb-1">
                <Cpu className="w-3.5 h-3.5 text-cyan-400" />
                <span>Outputs &amp; Execution</span>
              </div>

              <div className="p-3.5 rounded-xl border border-white/[0.06] bg-white/[0.02] flex items-center justify-between hover:border-cyan-500/30 transition-all">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-cyan-500/10 text-cyan-400 flex items-center justify-center">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-zinc-200">Grounded AI Copilot</div>
                    <div className="text-[10px] text-zinc-500 font-mono">100% Deterministic Citations</div>
                  </div>
                </div>
                <CheckCircle2 className="w-4 h-4 text-cyan-400" />
              </div>

              <div className="p-3.5 rounded-xl border border-white/[0.06] bg-white/[0.02] flex items-center justify-between hover:border-indigo-500/30 transition-all">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
                    <Database className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-zinc-200">Multi-Entity Search Engine</div>
                    <div className="text-[10px] text-zinc-500 font-mono">Faceted &lt; 50ms Search</div>
                  </div>
                </div>
                <CheckCircle2 className="w-4 h-4 text-indigo-400" />
              </div>

              <div className="p-3.5 rounded-xl border border-white/[0.06] bg-white/[0.02] flex items-center justify-between hover:border-emerald-500/30 transition-all">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-zinc-200">Timezone-Aware Task Board</div>
                    <div className="text-[10px] text-zinc-500 font-mono">Bangkok TZ Overdue Calculations</div>
                  </div>
                </div>
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              </div>

              <div className="p-3.5 rounded-xl border border-white/[0.06] bg-white/[0.02] flex items-center justify-between hover:border-purple-500/30 transition-all">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center">
                    <GitCommit className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-zinc-200">Architecture Decision Tree</div>
                    <div className="text-[10px] text-zinc-500 font-mono">Authoritative Source of Truth</div>
                  </div>
                </div>
                <CheckCircle2 className="w-4 h-4 text-purple-400" />
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
};
