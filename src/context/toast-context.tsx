"use client";

import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from "lucide-react";

export type ToastType = "success" | "error" | "info" | "warning";

export interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType>({
  showToast: () => {},
});

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (message: string, type: ToastType = "info") => {
      const id = Math.random().toString(36).substring(2, 9);
      setToasts((prev) => [...prev.slice(-3), { id, message, type }]);

      setTimeout(() => {
        removeToast(id);
      }, 4000);
    },
    [removeToast]
  );

  useEffect(() => {
    if (typeof window !== "undefined") {
      (window as any).__showToast = showToast;
    }
  }, [showToast]);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none">
        {toasts.map((toast) => {
          let Icon = Info;
          let iconColor = "text-blue-500";
          let borderAccent = "border-slate-200/90";

          if (toast.type === "success") {
            Icon = CheckCircle2;
            iconColor = "text-emerald-500";
            borderAccent = "border-emerald-200/80";
          } else if (toast.type === "error") {
            Icon = AlertCircle;
            iconColor = "text-rose-500";
            borderAccent = "border-rose-200/80";
          } else if (toast.type === "warning") {
            Icon = AlertTriangle;
            iconColor = "text-amber-500";
            borderAccent = "border-amber-200/80";
          }

          return (
            <div
              key={toast.id}
              className={`pointer-events-auto flex items-center gap-3 px-4 py-3 bg-white ${borderAccent} border rounded-2xl shadow-[0_12px_32px_-4px_rgba(16,24,40,0.12),0_4px_12px_-2px_rgba(16,24,40,0.06)] text-xs transition-all duration-200 animate-in fade-in slide-in-from-bottom-2`}
              role="alert"
            >
              <Icon className={`w-4 h-4 shrink-0 stroke-[2.2] ${iconColor}`} />
              <div className="flex-1 font-semibold text-slate-800 leading-snug break-words">
                {toast.message}
              </div>
              <button
                type="button"
                onClick={() => removeToast(toast.id)}
                className="text-slate-400 hover:text-slate-700 hover:bg-slate-100 p-1 rounded-lg transition-colors shrink-0 ml-1"
                aria-label="Close notification"
              >
                <X className="w-3.5 h-3.5 stroke-[2]" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
