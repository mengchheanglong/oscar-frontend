"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { ApiError } from "@/lib/api";
import {
  Eye,
  EyeOff,
  AlertCircle,
  ArrowLeft,
  Mail,
  Loader2,
  FileText,
  Folder,
  HelpCircle,
  Check,
  Sparkles,
} from "lucide-react";
import { AiWorkspaceIcon } from "@/components/ai-workspace-logo";

type AuthMode = "login" | "register" | "forgot";

interface FieldErrors {
  email?: string;
  password?: string;
  confirm?: string;
  agreeTerms?: string;
}

interface TouchedFields {
  email?: boolean;
  password?: boolean;
  confirm?: boolean;
  agreeTerms?: boolean;
}

// Validation helpers
const validateEmail = (val: string): string | null => {
  if (!val.trim()) return "Email is required.";
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(val.trim())) {
    return "Please enter a valid email address (e.g. user@example.com).";
  }
  return null;
};

const validatePassword = (val: string): string | null => {
  if (!val) return "Password is required.";
  if (val.length < 8) return "Password must be at least 8 characters long.";
  return null;
};

const validateConfirmPassword = (val: string, passVal: string): string | null => {
  if (!val) return "Please confirm your password.";
  if (val !== passVal) return "Passwords do not match.";
  return null;
};

function SocialAuthButtons({
  onSocialClick,
  notice,
  onDismissNotice,
}: {
  onSocialClick: (provider: string) => void;
  notice: string | null;
  onDismissNotice: () => void;
}) {
  return (
    <div className="space-y-2.5">
      {/* Divider */}
      <div className="relative flex items-center justify-center my-3">
        <div className="border-t border-slate-200 w-full" />
        <span className="bg-[#f0f2f5] px-2.5 text-[10.5px] text-slate-400 whitespace-nowrap">
          or continue with
        </span>
        <div className="border-t border-slate-200 w-full" />
      </div>

      {/* Social Buttons */}
      <div className="grid grid-cols-2 gap-2.5">
        {/* Google SSO Button */}
        <button
          type="button"
          onClick={() => onSocialClick("Google")}
          className="h-8.5 bg-white border border-slate-200 hover:bg-slate-50 hover:border-slate-300 rounded-lg flex items-center justify-center gap-2 text-xs font-medium text-slate-700 shadow-2xs transition-all hover:shadow-xs active:scale-[0.99]"
          title="Sign in with Google (Coming soon)"
        >
          <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            />
          </svg>
          <span className="text-[11.5px] font-medium text-slate-700">Google</span>
        </button>

        {/* GitHub SSO Button */}
        <button
          type="button"
          onClick={() => onSocialClick("GitHub")}
          className="h-8.5 bg-white border border-slate-200 hover:bg-slate-50 hover:border-slate-300 rounded-lg flex items-center justify-center gap-2 text-xs font-medium text-slate-700 shadow-2xs transition-all hover:shadow-xs active:scale-[0.99]"
          title="Sign in with GitHub (Coming soon)"
        >
          <svg className="w-3.5 h-3.5 shrink-0 fill-slate-900" viewBox="0 0 24 24">
            <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
          </svg>
          <span className="text-[11.5px] font-medium text-slate-700">GitHub</span>
        </button>
      </div>

      {/* Friendly Informational Feedback Notice when clicked */}
      {notice && (
        <div className="p-2.5 rounded-lg bg-amber-50/90 border border-amber-200/90 text-amber-950 flex items-start gap-2 text-xs shadow-2xs animate-in fade-in slide-in-from-top-1 duration-150">
          <Sparkles className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-600" />
          <div className="text-[11.5px] leading-snug flex-1">{notice}</div>
          <button
            type="button"
            onClick={onDismissNotice}
            className="text-amber-500 hover:text-amber-800 text-xs font-bold leading-none p-0.5 transition-colors"
            aria-label="Dismiss notice"
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const { user, isLoading, login, register } = useAuth();

  // Redirect if already authenticated
  useEffect(() => {
    if (!isLoading && user) {
      router.replace("/assistant");
    }
  }, [user, isLoading, router]);

  // Mode state
  const [mode, setMode] = useState<AuthMode>("login");

  // Form fields (pre-filled with demo account per user instruction)
  const [email, setEmail] = useState("codex@example.com");
  const [password, setPassword] = useState("Password123!");
  const [confirmPassword, setConfirmPassword] = useState("Password123!");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [agreeTerms, setAgreeTerms] = useState(true);

  // Status & error states
  const [error, setError] = useState<string | null>(null);
  const [socialNotice, setSocialNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [touched, setTouched] = useState<TouchedFields>({});

  // Reset password states
  const [resetSent, setResetSent] = useState(false);
  const [countdown, setCountdown] = useState(20);

  // Countdown timer for password reset resend
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (resetSent && countdown > 0) {
      timer = setTimeout(() => setCountdown((prev) => prev - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [resetSent, countdown]);

  // Mode switcher helper that cleans state
  const switchMode = (newMode: AuthMode) => {
    setMode(newMode);
    setError(null);
    setSocialNotice(null);
    setFieldErrors({});
    setTouched({});
    setResetSent(false);
  };

  // Field change & blur handlers with real-time validation
  const handleEmailChange = (val: string) => {
    setEmail(val);
    if (touched.email) {
      const err = validateEmail(val);
      setFieldErrors((prev) => ({ ...prev, email: err || undefined }));
    }
    if (error) setError(null);
  };

  const handleEmailBlur = () => {
    setTouched((prev) => ({ ...prev, email: true }));
    const err = validateEmail(email);
    setFieldErrors((prev) => ({ ...prev, email: err || undefined }));
  };

  const handlePasswordChange = (val: string) => {
    setPassword(val);
    if (touched.password) {
      const err = validatePassword(val);
      setFieldErrors((prev) => ({ ...prev, password: err || undefined }));
    }
    if (mode === "register" && touched.confirm && confirmPassword) {
      const confirmErr = validateConfirmPassword(confirmPassword, val);
      setFieldErrors((prev) => ({ ...prev, confirm: confirmErr || undefined }));
    }
    if (error) setError(null);
  };

  const handlePasswordBlur = () => {
    setTouched((prev) => ({ ...prev, password: true }));
    const err = validatePassword(password);
    setFieldErrors((prev) => ({ ...prev, password: err || undefined }));
  };

  const handleConfirmChange = (val: string) => {
    setConfirmPassword(val);
    if (touched.confirm) {
      const err = validateConfirmPassword(val, password);
      setFieldErrors((prev) => ({ ...prev, confirm: err || undefined }));
    }
    if (error) setError(null);
  };

  const handleConfirmBlur = () => {
    setTouched((prev) => ({ ...prev, confirm: true }));
    const err = validateConfirmPassword(confirmPassword, password);
    setFieldErrors((prev) => ({ ...prev, confirm: err || undefined }));
  };

  const handleTermsToggle = () => {
    const next = !agreeTerms;
    setAgreeTerms(next);
    if (touched.agreeTerms) {
      setFieldErrors((prev) => ({
        ...prev,
        agreeTerms: next ? undefined : "You must agree to the Terms of Service to continue.",
      }));
    }
  };

  // Quick fill helper for demo accounts
  const fillDemoAccount = (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    setConfirmPassword(demoPass);
    setFieldErrors({});
    setTouched({});
    setError(null);
  };

  // Social click feedback
  const handleSocialClick = (provider: string) => {
    setError(null);
    setSocialNotice(
      `${provider} Single Sign-On is coming soon in an upcoming release. Please use your email & password credentials or a quick-fill demo account.`
    );
  };

  // Submit Login
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Mark fields as touched
    setTouched({ email: true, password: true });

    const emailErr = validateEmail(email);
    const passwordErr = validatePassword(password);

    if (emailErr || passwordErr) {
      setFieldErrors({
        email: emailErr || undefined,
        password: passwordErr || undefined,
      });
      setError("Please resolve the highlighted fields to continue.");
      return;
    }

    setLoading(true);
    try {
      await login(email, password);
      router.push("/assistant");
    } catch (err: any) {
      if (err instanceof ApiError || err.status) {
        if (err.status === 401) {
          if (err.code === "ACCOUNT_DISABLED") {
            setError("Your account has been deactivated. Please contact an administrator.");
          } else {
            setError("Incorrect email or password. Double-check and try again.");
            setFieldErrors({
              email: "Check your email",
              password: "Check your password",
            });
          }
        } else if (err.status === 400 && Array.isArray(err.details)) {
          const mapped: FieldErrors = {};
          err.details.forEach((d: { field: string; message: string }) => {
            if (d.field.includes("email")) mapped.email = d.message;
            if (d.field.includes("password")) mapped.password = d.message;
          });
          setFieldErrors(mapped);
          setError(err.message || "Please correct the highlighted fields.");
        } else {
          setError(err.message || "Login failed. Please check your credentials.");
        }
      } else {
        const msg = err.message || "";
        if (
          msg.includes("Failed to fetch") ||
          msg.includes("NetworkError") ||
          msg.includes("status 0")
        ) {
          setError("Unable to connect to backend. Please ensure the backend server is running.");
        } else {
          setError(msg || "Incorrect email or password. Double-check and try again.");
        }
      }
    } finally {
      setLoading(false);
    }
  };

  // Submit Register
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    setTouched({ email: true, password: true, confirm: true, agreeTerms: true });

    const emailErr = validateEmail(email);
    const passwordErr = validatePassword(password);
    const confirmErr = validateConfirmPassword(confirmPassword, password);
    const termsErr = !agreeTerms ? "You must agree to the Terms of Service to continue." : null;

    if (emailErr || passwordErr || confirmErr || termsErr) {
      setFieldErrors({
        email: emailErr || undefined,
        password: passwordErr || undefined,
        confirm: confirmErr || undefined,
        agreeTerms: termsErr || undefined,
      });
      setError("Please resolve the highlighted fields to continue.");
      return;
    }

    setLoading(true);
    try {
      await register(email, password);
      router.push("/assistant");
    } catch (err: any) {
      if (err instanceof ApiError || err.status) {
        if (err.status === 409 || err.code === "EMAIL_ALREADY_EXISTS") {
          setFieldErrors((prev) => ({
            ...prev,
            email: "A user with this email address already exists.",
          }));
          setError("This email address is already registered. Please sign in instead.");
        } else if (err.status === 400 && Array.isArray(err.details)) {
          const mapped: FieldErrors = {};
          err.details.forEach((d: { field: string; message: string }) => {
            if (d.field.includes("email")) mapped.email = d.message;
            if (d.field.includes("password")) mapped.password = d.message;
          });
          setFieldErrors(mapped);
          setError(err.message || "Please correct the highlighted fields.");
        } else {
          setError(err.message || "Registration failed. Please try again.");
        }
      } else {
        const msg = err.message || "";
        if (
          msg.includes("Failed to fetch") ||
          msg.includes("NetworkError") ||
          msg.includes("status 0")
        ) {
          setError("Unable to connect to backend. Please ensure the backend server is running.");
        } else {
          setError(msg || "Registration failed. Please try again.");
        }
      }
    } finally {
      setLoading(false);
    }
  };

  // Submit Password Reset Request
  const handleResetSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setTouched((prev) => ({ ...prev, email: true }));

    const emailErr = validateEmail(email);
    if (emailErr) {
      setFieldErrors({ email: emailErr });
      setError("Please enter a valid email address.");
      return;
    }

    setResetSent(true);
    setCountdown(20);
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-[#f0f2f5] select-none text-slate-900 font-sans">
      {/* LEFT PANEL: Dark Hero Canvas (#141824) */}
      <div className="lg:w-1/2 bg-[#141824] text-white p-8 sm:p-12 lg:p-14 flex flex-col justify-between shrink-0 relative">
        {/* Brand Header */}
        <div className="flex items-center gap-2.5">
          <AiWorkspaceIcon size="sm" variant="card" />
          <span className="font-semibold text-base tracking-tight text-white font-sans">
            Workspace
          </span>
        </div>

        {/* Center Hero Content */}
        <div className="my-10 lg:my-0 max-w-md space-y-3.5">
          <h1 className="text-3xl sm:text-4xl lg:text-[38px] font-bold tracking-tight text-white leading-[1.18] font-serif">
            One workspace. <br />
            Every answer,{" "}
            <span className="text-[#5c77ff] font-serif">sourced.</span>
          </h1>

          <p className="text-slate-400 text-xs sm:text-[13px] leading-relaxed max-w-sm pt-1">
            Requirements, decisions, tasks, meetings, and documents in one place — with an AI copilot that answers project questions and always shows where the answer came from.
          </p>
        </div>

        {/* Bottom AI Copilot Showcase Card */}
        <div className="max-w-[340px] sm:max-w-[370px] w-full bg-[#161c2d] border border-[#263152] rounded-xl p-4 shadow-[0_0_30px_-5px_rgba(67,97,238,0.18)] space-y-2.5">
          <div className="text-[11px] font-normal text-[#8fa0b8]">
            Ask AI Workspace · &ldquo;What auth methods are we shipping?&rdquo;
          </div>

          <p className="text-[11.5px] text-slate-300 leading-relaxed">
            AI Project Workspace provides email/password sign-in with argon2id hashed passwords and per-user session scoping.
          </p>

          {/* Sourced Citations */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-[#d97706]/10 border border-[#d97706]/40 text-[#fbbf24] text-[10.5px]">
              <FileText className="w-3 h-3 text-[#f59e0b]" />
              Requirements.md
            </span>

            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-[#d97706]/10 border border-[#d97706]/40 text-[#fbbf24] text-[10.5px]">
              <Folder className="w-3 h-3 text-[#f59e0b]" />
              Meeting notes · Sep 3
            </span>

            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-[#d97706]/10 border border-[#d97706]/40 text-[#fbbf24] text-[10.5px]">
              <HelpCircle className="w-3 h-3 text-[#f59e0b]" />
              GitHub PR #142
            </span>
          </div>
        </div>
      </div>

      {/* RIGHT PANEL: Light Form Canvas (#f0f2f5) */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12 lg:p-16 bg-[#f0f2f5]">
        <div className="max-w-[330px] sm:max-w-[340px] w-full space-y-4">
          {/* ================= MODE 1: LOGIN (DEFAULT) ================= */}
          {mode === "login" && (
            <>
              {/* Header */}
              <div className="space-y-1">
                <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 font-serif">
                  Sign in to AI Workspace
                </h2>
                <p className="text-xs text-slate-500">
                  Already have an account? Log in to your workspace account.
                </p>
              </div>

              {/* Error Banner with Dynamic Feedback */}
              {error && (
                <div className="p-2.5 rounded-lg bg-[#fde8e8] border border-[#fca5a5] text-xs text-red-800 flex items-start gap-2 leading-relaxed animate-in fade-in duration-200">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-red-600" />
                  <div className="text-[11.5px] leading-snug">{error}</div>
                </div>
              )}

              {/* Form */}
              <form onSubmit={handleLoginSubmit} noValidate className="space-y-3.5">
                {/* Email Field */}
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-700">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => handleEmailChange(e.target.value)}
                    onBlur={handleEmailBlur}
                    placeholder="Enter your email"
                    className={`w-full h-9 px-3 rounded-md text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none transition-all ${
                      fieldErrors.email
                        ? "bg-[#fde8e8] border border-red-400 focus:ring-1 focus:ring-red-400"
                        : "bg-white border border-slate-300 focus:border-[#4361ee] focus:ring-1 focus:ring-[#4361ee]"
                    }`}
                  />
                  {fieldErrors.email && (
                    <p className="text-[11px] text-red-600 flex items-center gap-1 mt-1 animate-in fade-in duration-150">
                      <AlertCircle className="w-3 h-3 shrink-0" />
                      <span>{fieldErrors.email}</span>
                    </p>
                  )}
                </div>

                {/* Password Field with Eye Toggle */}
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-700">Password</label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => handlePasswordChange(e.target.value)}
                      onBlur={handlePasswordBlur}
                      placeholder="Enter your password"
                      className={`w-full h-9 pl-3 pr-9 rounded-md text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none transition-all ${
                        fieldErrors.password
                          ? "bg-[#fde8e8] border border-red-400 focus:ring-1 focus:ring-red-400"
                          : "bg-white border border-slate-300 focus:border-[#4361ee] focus:ring-1 focus:ring-[#4361ee]"
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  {fieldErrors.password && (
                    <p className="text-[11px] text-red-600 flex items-center gap-1 mt-1 animate-in fade-in duration-150">
                      <AlertCircle className="w-3 h-3 shrink-0" />
                      <span>{fieldErrors.password}</span>
                    </p>
                  )}
                </div>

                {/* Remember Me & Forgot Password */}
                <div className="flex items-center justify-between text-xs pt-0.5">
                  <label className="flex items-center gap-1.5 cursor-pointer text-slate-700">
                    <button
                      type="button"
                      onClick={() => setRememberMe(!rememberMe)}
                      className={`w-3.5 h-3.5 rounded-full flex items-center justify-center transition-colors ${
                        rememberMe ? "bg-[#4361ee] text-white" : "border border-slate-300 bg-white"
                      }`}
                      aria-checked={rememberMe}
                      role="checkbox"
                    >
                      {rememberMe && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                    </button>
                    <span className="text-[11.5px]">Remember Me</span>
                  </label>

                  <button
                    type="button"
                    onClick={() => switchMode("forgot")}
                    className="text-[#4361ee] hover:underline font-normal text-[11.5px]"
                  >
                    Forgot Password?
                  </button>
                </div>

                {/* Primary Submit Button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full h-9 bg-[#4361ee] hover:bg-[#3751d8] text-white font-medium text-xs rounded-md shadow-xs transition-colors flex items-center justify-center"
                >
                  {loading ? (
                    <div className="flex items-center justify-center gap-2">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Signing in...</span>
                    </div>
                  ) : (
                    "Log in"
                  )}
                </button>
              </form>

              {/* Demo Accounts Quick-Fill Pill Bar */}
              <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[11px] text-slate-500">
                <span className="text-slate-400">Quick fill:</span>
                <button
                  type="button"
                  onClick={() => fillDemoAccount("codex@example.com", "Password123!")}
                  className="font-medium text-slate-700 hover:underline bg-slate-100 px-2 py-0.5 rounded border border-slate-200 transition-colors"
                >
                  Codex (Admin)
                </button>
                <button
                  type="button"
                  onClick={() => fillDemoAccount("claude@example.com", "Password123!")}
                  className="font-medium text-[#4361ee] hover:underline bg-blue-50 px-2 py-0.5 rounded border border-blue-100 transition-colors"
                >
                  Claude (Member)
                </button>
              </div>

              {/* Social Buttons (Coming Soon) */}
              <SocialAuthButtons
                onSocialClick={handleSocialClick}
                notice={socialNotice}
                onDismissNotice={() => setSocialNotice(null)}
              />

              {/* Bottom Switch to Register */}
              <div className="text-center text-[11.5px] text-slate-500 pt-1.5">
                New to AI Workspace?{" "}
                <button
                  type="button"
                  onClick={() => switchMode("register")}
                  className="text-[#4361ee] hover:underline font-normal"
                >
                  Create an account
                </button>
              </div>
            </>
          )}

          {/* ================= MODE 2: REGISTER ================= */}
          {mode === "register" && (
            <>
              {/* Header */}
              <div className="space-y-1">
                <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 font-serif">
                  Create your AI Workspace account
                </h2>
                <p className="text-xs text-slate-500">
                  New here? Create your very own workspace account.
                </p>
              </div>

              {/* Error Banner with Dynamic Feedback */}
              {error && (
                <div className="p-2.5 rounded-lg bg-[#fde8e8] border border-[#fca5a5] text-xs text-red-800 flex items-start gap-2 leading-relaxed animate-in fade-in duration-200">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-red-600" />
                  <div className="text-[11.5px] leading-snug">{error}</div>
                </div>
              )}

              {/* Form */}
              <form onSubmit={handleRegisterSubmit} noValidate className="space-y-3.5">
                {/* Email Field */}
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-700">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => handleEmailChange(e.target.value)}
                    onBlur={handleEmailBlur}
                    placeholder="Enter your email"
                    className={`w-full h-9 px-3 rounded-md text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none transition-all ${
                      fieldErrors.email
                        ? "bg-[#fde8e8] border border-red-400 focus:ring-1 focus:ring-red-400"
                        : "bg-white border border-slate-300 focus:border-[#4361ee] focus:ring-1 focus:ring-[#4361ee]"
                    }`}
                  />
                  {fieldErrors.email && (
                    <p className="text-[11px] text-red-600 flex items-center gap-1 mt-1 animate-in fade-in duration-150">
                      <AlertCircle className="w-3 h-3 shrink-0" />
                      <span>{fieldErrors.email}</span>
                    </p>
                  )}
                </div>

                {/* Password Field */}
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-700">Password</label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => handlePasswordChange(e.target.value)}
                      onBlur={handlePasswordBlur}
                      placeholder="At least 8 characters"
                      className={`w-full h-9 pl-3 pr-9 rounded-md text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none transition-all ${
                        fieldErrors.password
                          ? "bg-[#fde8e8] border border-red-400 focus:ring-1 focus:ring-red-400"
                          : "bg-white border border-slate-300 focus:border-[#4361ee] focus:ring-1 focus:ring-[#4361ee]"
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  {fieldErrors.password && (
                    <p className="text-[11px] text-red-600 flex items-center gap-1 mt-1 animate-in fade-in duration-150">
                      <AlertCircle className="w-3 h-3 shrink-0" />
                      <span>{fieldErrors.password}</span>
                    </p>
                  )}
                </div>

                {/* Confirm Password Field */}
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-700">Confirm Password</label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => handleConfirmChange(e.target.value)}
                      onBlur={handleConfirmBlur}
                      placeholder="Re-enter your password"
                      className={`w-full h-9 pl-3 pr-9 rounded-md text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none transition-all ${
                        fieldErrors.confirm
                          ? "bg-[#fde8e8] border border-red-400 focus:ring-1 focus:ring-red-400"
                          : "bg-white border border-slate-300 focus:border-[#4361ee] focus:ring-1 focus:ring-[#4361ee]"
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                      aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                    >
                      {showConfirmPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  {fieldErrors.confirm && (
                    <p className="text-[11px] text-red-600 flex items-center gap-1 mt-1 animate-in fade-in duration-150">
                      <AlertCircle className="w-3 h-3 shrink-0" />
                      <span>{fieldErrors.confirm}</span>
                    </p>
                  )}
                </div>

                {/* Terms Agreement Checkbox */}
                <div className="space-y-1 pt-0.5">
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={handleTermsToggle}
                      className={`w-3.5 h-3.5 rounded-full flex items-center justify-center transition-colors shrink-0 ${
                        agreeTerms ? "bg-[#4361ee] text-white" : "border border-slate-300 bg-white"
                      }`}
                      role="checkbox"
                      aria-checked={agreeTerms}
                    >
                      {agreeTerms && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                    </button>
                    <span className="text-[11.5px] text-slate-600">
                      I agree to the{" "}
                      <span className="text-[#4361ee] hover:underline cursor-pointer">Terms of Service</span> and{" "}
                      <span className="text-[#4361ee] hover:underline cursor-pointer">Privacy Policy</span>
                    </span>
                  </div>
                  {fieldErrors.agreeTerms && (
                    <p className="text-[11px] text-red-600 flex items-center gap-1 mt-1 animate-in fade-in duration-150">
                      <AlertCircle className="w-3 h-3 shrink-0" />
                      <span>{fieldErrors.agreeTerms}</span>
                    </p>
                  )}
                </div>

                {/* Create Account Submit Button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full h-9 bg-[#4361ee] hover:bg-[#3751d8] text-white font-medium text-xs rounded-md shadow-xs transition-colors flex items-center justify-center"
                >
                  {loading ? (
                    <div className="flex items-center justify-center gap-2">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Creating account...</span>
                    </div>
                  ) : (
                    "Create an account"
                  )}
                </button>
              </form>

              {/* Social Buttons (Coming Soon) */}
              <SocialAuthButtons
                onSocialClick={handleSocialClick}
                notice={socialNotice}
                onDismissNotice={() => setSocialNotice(null)}
              />

              {/* Bottom Switch to Login */}
              <div className="text-center text-[11.5px] text-slate-500 pt-1.5">
                Already have an account?{" "}
                <button
                  type="button"
                  onClick={() => switchMode("login")}
                  className="text-[#4361ee] hover:underline font-normal"
                >
                  Log in
                </button>
              </div>
            </>
          )}

          {/* ================= MODE 3: RESET PASSWORD ================= */}
          {mode === "forgot" && (
            <>
              {/* Back to log in link */}
              <button
                type="button"
                onClick={() => switchMode("login")}
                className="inline-flex items-center gap-1.5 text-xs text-[#4361ee] hover:underline font-normal"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to log in</span>
              </button>

              <div className="space-y-1 pt-1">
                <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 font-serif">
                  Reset your password
                </h2>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Enter the email on your AI Workspace account and we&apos;ll send you a link to reset your password.
                </p>
              </div>

              {/* Error Banner with Dynamic Feedback */}
              {error && (
                <div className="p-2.5 rounded-lg bg-[#fde8e8] border border-[#fca5a5] text-xs text-red-800 flex items-start gap-2 leading-relaxed animate-in fade-in duration-200">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-red-600" />
                  <div className="text-[11.5px] leading-snug">{error}</div>
                </div>
              )}

              {!resetSent ? (
                /* Send Reset Link Form */
                <form onSubmit={handleResetSubmit} noValidate className="space-y-3.5 pt-1">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-700">Email</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => handleEmailChange(e.target.value)}
                      onBlur={handleEmailBlur}
                      placeholder="Enter your email"
                      className={`w-full h-9 px-3 rounded-md text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none transition-all ${
                        fieldErrors.email
                          ? "bg-[#fde8e8] border border-red-400 focus:ring-1 focus:ring-red-400"
                          : "bg-white border border-slate-300 focus:border-[#4361ee] focus:ring-1 focus:ring-[#4361ee]"
                      }`}
                    />
                    {fieldErrors.email && (
                      <p className="text-[11px] text-red-600 flex items-center gap-1 mt-1 animate-in fade-in duration-150">
                        <AlertCircle className="w-3 h-3 shrink-0" />
                        <span>{fieldErrors.email}</span>
                      </p>
                    )}
                  </div>

                  <button
                    type="submit"
                    className="w-full h-9 bg-[#4361ee] hover:bg-[#3751d8] text-white font-medium text-xs rounded-md shadow-xs transition-colors flex items-center justify-center"
                  >
                    Send reset link
                  </button>
                </form>
              ) : (
                /* Success Sent State */
                <div className="space-y-3.5 pt-2">
                  {/* Mail icon bubble */}
                  <div className="w-9 h-9 rounded-lg bg-blue-100/70 text-[#4361ee] flex items-center justify-center">
                    <Mail className="w-4 h-4" />
                  </div>

                  <div className="space-y-1">
                    <h3 className="text-sm font-bold text-slate-900 font-serif">
                      Check your email
                    </h3>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      We sent reset instructions to <strong className="text-slate-900 font-semibold">{email || "you@company.com"}</strong>. If this email matches an active account, you can reset your password immediately.
                    </p>
                  </div>

                  <div className="text-xs text-slate-500 pt-1">
                    Didn&apos;t get it?{" "}
                    {countdown > 0 ? (
                      <span className="text-slate-400">Resend in {countdown}s</span>
                    ) : (
                      <button
                        type="button"
                        onClick={handleResetSubmit}
                        className="text-[#4361ee] hover:underline font-normal"
                      >
                        Resend reset link
                      </button>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
