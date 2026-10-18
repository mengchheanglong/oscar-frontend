"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { ApiError } from "@/lib/api";
import { Eye, EyeOff, AlertCircle, ArrowLeft, Mail, Loader2, Check } from "lucide-react";
import { WorkspaceIcon } from "@/components/workspace-icons";
import { WorkspaceAppearance } from "@/context/workspace-theme";

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

const validateConfirmPassword = (
  val: string,
  passVal: string,
): string | null => {
  if (!val) return "Please confirm your password.";
  if (val !== passVal) return "Passwords do not match.";
  return null;
};

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
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("mode") === "register")
      setMode("register");
  }, []);

  // Account details are entered by the user.
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [agreeTerms, setAgreeTerms] = useState(true);

  // Status & error states
  const [error, setError] = useState<string | null>(null);
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
        agreeTerms: next
          ? undefined
          : "You must agree to the Terms of Service to continue.",
      }));
    }
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
            setError(
              "Your account has been deactivated. Please contact an administrator.",
            );
          } else {
            setError(
              "Incorrect email or password. Double-check and try again.",
            );
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
          setError(
            err.message || "Login failed. Please check your credentials.",
          );
        }
      } else {
        const msg = err.message || "";
        if (
          msg.includes("Failed to fetch") ||
          msg.includes("NetworkError") ||
          msg.includes("status 0")
        ) {
          setError(
            "Unable to connect to backend. Please ensure the backend server is running.",
          );
        } else {
          setError(
            msg || "Incorrect email or password. Double-check and try again.",
          );
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

    setTouched({
      email: true,
      password: true,
      confirm: true,
      agreeTerms: true,
    });

    const emailErr = validateEmail(email);
    const passwordErr = validatePassword(password);
    const confirmErr = validateConfirmPassword(confirmPassword, password);
    const termsErr = !agreeTerms
      ? "You must agree to the Terms of Service to continue."
      : null;

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
          setError(
            "This email address is already registered. Please sign in instead.",
          );
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
          setError(
            "Unable to connect to backend. Please ensure the backend server is running.",
          );
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
    <div className="workspace-auth">
      <header className="workspace-auth-header">
        <a
          href="/assistant"
          aria-label="Continuum"
          className="workspace-icon-button"
        >
          <WorkspaceIcon name="mark" className="!h-7 !w-7" />
        </a>
        <WorkspaceAppearance />
      </header>
      <div className="workspace-auth-content">
        <div className="max-w-[330px] sm:max-w-[340px] w-full space-y-4">
          {/* ================= MODE 1: LOGIN (DEFAULT) ================= */}
          {mode === "login" && (
            <>
              {/* Header */}
              <div className="space-y-1">
                <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 font-serif">
                  Sign in to Continuum
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
              <form
                onSubmit={handleLoginSubmit}
                noValidate
                className="space-y-3.5"
              >
                {/* Email Field */}
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-700">
                    Email
                  </label>
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
                  <label className="text-xs font-medium text-slate-700">
                    Password
                  </label>
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
                      aria-label={
                        showPassword ? "Hide password" : "Show password"
                      }
                    >
                      {showPassword ? (
                        <EyeOff className="w-3.5 h-3.5" />
                      ) : (
                        <Eye className="w-3.5 h-3.5" />
                      )}
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
                        rememberMe
                          ? "bg-[#4361ee] text-white"
                          : "border border-slate-300 bg-white"
                      }`}
                      aria-checked={rememberMe}
                      role="checkbox"
                    >
                      {rememberMe && (
                        <Check className="w-2.5 h-2.5 stroke-[3]" />
                      )}
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

              {/* Bottom Switch to Register */}
              <div className="text-center text-[11.5px] text-slate-500 pt-1.5">
                New to Continuum?{" "}
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
                  Create your Continuum account
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
              <form
                onSubmit={handleRegisterSubmit}
                noValidate
                className="space-y-3.5"
              >
                {/* Email Field */}
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-700">
                    Email
                  </label>
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
                  <label className="text-xs font-medium text-slate-700">
                    Password
                  </label>
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
                      aria-label={
                        showPassword ? "Hide password" : "Show password"
                      }
                    >
                      {showPassword ? (
                        <EyeOff className="w-3.5 h-3.5" />
                      ) : (
                        <Eye className="w-3.5 h-3.5" />
                      )}
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
                  <label className="text-xs font-medium text-slate-700">
                    Confirm Password
                  </label>
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
                      onClick={() =>
                        setShowConfirmPassword(!showConfirmPassword)
                      }
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                      aria-label={
                        showConfirmPassword ? "Hide password" : "Show password"
                      }
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="w-3.5 h-3.5" />
                      ) : (
                        <Eye className="w-3.5 h-3.5" />
                      )}
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
                        agreeTerms
                          ? "bg-[#4361ee] text-white"
                          : "border border-slate-300 bg-white"
                      }`}
                      role="checkbox"
                      aria-checked={agreeTerms}
                    >
                      {agreeTerms && (
                        <Check className="w-2.5 h-2.5 stroke-[3]" />
                      )}
                    </button>
                    <span className="text-[11.5px] text-slate-600">
                      I agree to the{" "}
                      <span className="text-[#4361ee] hover:underline cursor-pointer">
                        Terms of Service
                      </span>{" "}
                      and{" "}
                      <span className="text-[#4361ee] hover:underline cursor-pointer">
                        Privacy Policy
                      </span>
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
                  Enter the email on your Continuum account and we&apos;ll
                  send you a link to reset your password.
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
                <form
                  onSubmit={handleResetSubmit}
                  noValidate
                  className="space-y-3.5 pt-1"
                >
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-700">
                      Email
                    </label>
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
                      We sent reset instructions to{" "}
                      <strong className="text-slate-900 font-semibold">
                        {email || "you@company.com"}
                      </strong>
                      . If this email matches an active account, you can reset
                      your password immediately.
                    </p>
                  </div>

                  <div className="text-xs text-slate-500 pt-1">
                    Didn&apos;t get it?{" "}
                    {countdown > 0 ? (
                      <span className="text-slate-400">
                        Resend in {countdown}s
                      </span>
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
