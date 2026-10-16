"use client";

import React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Sparkles, Shield, Database, Terminal } from "lucide-react";
import { AiWorkspaceMark } from "@/components/ai-workspace-logo";

export const CtaSection: React.FC = () => {
  return (
    <section className="relative py-24 px-4 sm:px-6 lg:px-8 bg-[#08090a] border-t border-white/[0.06] overflow-hidden">
      {/* Magic UI Radial Lighting */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-gradient-to-r from-[#00F2FE]/20 via-[#4361EE]/20 to-[#6366F1]/20 rounded-full blur-[140px] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 35, scale: 0.97 }}
        whileInView={{ opacity: 1, y: 0, scale: 1 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.6 }}
        className="relative max-w-4xl mx-auto rounded-3xl border border-white/[0.1] bg-[#0c0d12]/90 p-8 sm:p-14 text-center backdrop-blur-2xl shadow-[0_0_80px_rgba(0,0,0,0.8)] space-y-8"
      >
        <div className="flex justify-center">
          <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/[0.08] shadow-inner">
            <AiWorkspaceMark className="w-12 h-12" />
          </div>
        </div>

        <div className="space-y-3 max-w-2xl mx-auto">
          <h2 className="text-3xl sm:text-5xl font-bold tracking-tight text-white leading-tight">
            Stop Guessing. <br />
            <span className="bg-gradient-to-r from-[#00F2FE] via-[#4FACFE] to-[#0052D4] bg-clip-text text-transparent">
              Start Grounding Every Decision.
            </span>
          </h2>
          <p className="text-sm text-zinc-400 leading-relaxed">
            Experience deterministic workspace intelligence with PostgreSQL pgvector, strict 404 access isolation, and automatic meeting-to-task conversion.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
          <Link href="/assistant">
            <button className="relative inline-flex items-center justify-center gap-2 px-7 py-3.5 text-xs sm:text-sm font-semibold text-white bg-gradient-to-r from-[#00F2FE] via-[#4361EE] to-[#6366F1] rounded-full shadow-[0_0_30px_rgba(67,97,238,0.4)] hover:shadow-[0_0_40px_rgba(67,97,238,0.6)] hover:scale-[1.02] transition-all">
              <span>Open AI Workspace</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </Link>
          <Link href="/login">
            <button className="px-6 py-3.5 text-xs sm:text-sm font-medium text-zinc-300 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.1] rounded-full transition-all">
              Sign In Demo Account
            </button>
          </Link>
        </div>

        {/* Badges footer */}
        <div className="pt-6 border-t border-white/[0.06] flex flex-wrap items-center justify-center gap-6 text-[11px] text-zinc-400 font-mono">
          <div className="flex items-center gap-1.5">
            <Database className="w-3.5 h-3.5 text-cyan-400" /> PostgreSQL + pgvector
          </div>
          <div className="flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5 text-emerald-400" /> Argon2id + 404 Isolation
          </div>
          <div className="flex items-center gap-1.5">
            <Terminal className="w-3.5 h-3.5 text-indigo-400" /> NestJS API v1
          </div>
        </div>
      </motion.div>
    </section>
  );
};
