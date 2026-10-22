"use client";
import { useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";

export function Modal({
  label,
  onClose,
  busy = false,
  placement = "center",
  children,
}: {
  label: string;
  onClose: () => void;
  busy?: boolean;
  placement?: "center" | "right";
  children: ReactNode;
}) {
  const surface = useRef<HTMLDivElement>(null),
    close = useRef(onClose),
    pending = useRef(busy);
  close.current = onClose;
  pending.current = busy;
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null,
      overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusable = () =>
      Array.from(
        surface.current?.querySelectorAll<HTMLElement>(
          'input:not(:disabled),textarea:not(:disabled),select:not(:disabled),button:not(:disabled),a[href],[tabindex="0"]',
        ) || [],
      ).filter((element) => element.getClientRects().length > 0);
    (focusable()[0] || surface.current)?.focus();
    const key = (event: KeyboardEvent) => {
      if (
        Array.from(document.querySelectorAll("[data-oscar-modal]")).at(-1) !==
        surface.current
      )
        return;
      if (event.key === "Escape" && !event.isComposing) {
        event.preventDefault();
        if (!pending.current) close.current();
      }
      if (event.key === "Tab") {
        const items = focusable(),
          first = items[0],
          last = items[items.length - 1];
        if (!first) {
          event.preventDefault();
          return;
        }
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("keydown", key);
      document.body.style.overflow = overflow;
      previous?.focus();
    };
  }, []);
  if (typeof document === "undefined") return null;
  return createPortal(
    <div
      className={`fixed inset-0 z-50 flex bg-black/60 backdrop-blur-sm ${placement === "right" ? "justify-end" : "items-center justify-center p-4"}`}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !pending.current)
          close.current();
      }}
    >
      <div
        data-oscar-modal
        role="dialog"
        aria-modal="true"
        aria-label={label}
        tabIndex={-1}
        ref={surface}
        className={`w-full overflow-y-auto outline-none ${placement === "right" ? "h-full max-w-2xl" : "max-h-[calc(100dvh-2rem)] max-w-lg rounded-2xl"}`}
      >
        {children}
      </div>
    </div>,
    document.body,
  );
}
