"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { api, setCsrfToken } from "@/lib/api";
import { ContinuumLogo } from "@/components/continuum-logo";
import {
  Sparkles,
  Eye,
  EyeOff,
  AlertCircle,
  ArrowRight,
  UserCheck,
  Mail,
  Lock,
  User,
} from "lucide-react";

export default function AcceptInvitePage() {
  const params = useParams();
  const rawToken = params?.token as string;
  const token = rawToken ? decodeURIComponent(rawToken) : "";

  const [preview, setPreview] = useState<{
    email: string;
    systemRole: string;
    professionalRole: string;
    expiresAt: string;
    inviterName?: string;
  } | null>(null);

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  useEffect(() => {
    if (!token) {
      setLoadError("Invalid invitation link.");
      setLoading(false);
      return;
    }

    let isCancelled = false;
    async function fetchPreview() {
      setLoading(true);
      setLoadError("");
      try {
        const res = await api.invites.getPreview(token);
        const data = (res as any)?.data || res;
        if (!isCancelled) {
          setPreview(data);
        }
      } catch (err: any) {
        if (!isCancelled) {
          setLoadError(
            err.message || "This invitation link is invalid or has expired."
          );
        }
      } finally {
        if (!isCancelled) setLoading(false);
      }
    }

    fetchPreview();
    return () => {
      isCancelled = true;
    };
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      setSubmitError("Please enter your full name.");
      return;
    }
    if (password.length < 8) {
      setSubmitError("Password must be at least 8 characters long.");
      return;
    }
    if (password !== confirmPassword) {
      setSubmitError("Passwords do not match.");
      return;
    }

    setSubmitting(true);
    setSubmitError("");

    try {
      const res = await api.invites.accept({
        token,
        name: fullName.trim(),
        password,
      });

      const responseData = (res as any)?.data || res;
      if (responseData.csrfToken) {
        setCsrfToken(responseData.csrfToken);
      }

      // Reload the assistant to initialize the authenticated workspace.
      window.location.href = "/assistant";
    } catch (err: any) {
      setSubmitError(err.message || "Failed to accept invitation. Please try again.");
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0F111A] flex flex-col items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3 text-slate-400 text-xs">
          <div className="w-8 h-8 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
          <span>Verifying invitation details...</span>
        </div>
      </div>
    );
  }

  if (loadError || !preview) {
    return (
      <div className="min-h-screen bg-[#0F111A] flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md bg-[#161927] border border-white/[0.08] rounded-2xl p-8 text-center space-y-5 shadow-2xl">
          <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-400 flex items-center justify-center mx-auto">
            <AlertCircle className="w-6 h-6 stroke-[2]" />
          </div>
          <div className="space-y-1">
            <h1 className="text-xl font-bold text-white font-serif">
              Invitation Unavailable
            </h1>
            <p className="text-xs text-slate-400 leading-relaxed">
              {loadError || "This invitation link has expired or has already been used."}
            </p>
          </div>
          <div className="pt-2">
            <Link
              href="/login"
              className="inline-flex items-center justify-center gap-2 w-full h-11 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition-colors"
            >
              <span>Go to Sign In</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0F111A] flex flex-col items-center justify-center p-4 sm:p-6 select-none">
      {/* Background ambient gradient glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-600/10 rounded-full blur-[140px]" />
      </div>

      <div className="w-full max-w-lg relative z-10 space-y-6">
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center space-y-3">
          <ContinuumLogo size="lg" />
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[11px] font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Workspace Invitation</span>
          </div>
        </div>

        {/* Card Form Container */}
        <div className="bg-[#161927] border border-white/[0.08] rounded-2xl p-6 sm:p-8 shadow-2xl space-y-6">
          <div className="space-y-1 text-center sm:text-left">
            <h1 className="text-xl sm:text-2xl font-bold text-white font-serif tracking-tight">
              Join Your Team
            </h1>
            <p className="text-xs text-slate-400 leading-relaxed">
              {preview.inviterName ? (
                <>
                  <strong className="text-slate-200">{preview.inviterName}</strong> has invited you to join the team workspace as a{" "}
                  <strong className="text-blue-400 capitalize">{preview.professionalRole.toLowerCase()}</strong>.
                </>
              ) : (
                <>You have been invited to join the team workspace as a <strong className="text-blue-400 capitalize">{preview.professionalRole.toLowerCase()}</strong>.</>
              )}
            </p>
          </div>

          {submitError && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{submitError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email (Read-only) */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider block">
                Work Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="email"
                  disabled
                  readOnly
                  value={preview.email}
                  className="w-full h-11 rounded-xl bg-white/[0.03] border border-white/[0.06] pl-10 pr-4 text-xs font-mono text-slate-400 cursor-not-allowed select-none"
                />
              </div>
              <p className="text-[10px] text-slate-500">
                Fixed to this invitation.
              </p>
            </div>

            {/* Full Name */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider block">
                Full Display Name
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Alex Morgan"
                  className="w-full h-11 rounded-xl bg-white/[0.05] border border-white/[0.1] hover:border-white/20 focus:border-blue-500 pl-10 pr-4 text-xs text-white placeholder:text-slate-500 outline-none transition-colors"
                />
              </div>
            </div>

            {/* Passwords grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Password */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider block">
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    minLength={8}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Min. 8 characters"
                    className="w-full h-11 rounded-xl bg-white/[0.05] border border-white/[0.1] hover:border-white/20 focus:border-blue-500 pl-10 pr-10 text-xs text-white placeholder:text-slate-500 outline-none transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-slate-400 hover:text-white absolute right-3 top-1/2 -translate-y-1/2 p-1"
                    title={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider block">
                  Confirm Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    minLength={8}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repeat password"
                    className="w-full h-11 rounded-xl bg-white/[0.05] border border-white/[0.1] hover:border-white/20 focus:border-blue-500 pl-10 pr-4 text-xs text-white placeholder:text-slate-500 outline-none transition-colors"
                  />
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={submitting}
                className="w-full h-11 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white font-semibold text-xs shadow-md shadow-blue-600/20 flex items-center justify-center gap-2 transition-all disabled:opacity-50 cursor-pointer"
              >
                <UserCheck className="w-4 h-4" />
                <span>{submitting ? "Joining Workspace..." : "Create Account & Join Workspace"}</span>
              </button>
            </div>
          </form>

          {/* Footer note */}
          <div className="border-t border-white/[0.06] pt-4 text-center">
            <p className="text-[11px] text-slate-500">
              Already have an account?{" "}
              <Link href="/login" className="text-blue-400 hover:underline font-medium">
                Sign in here
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
