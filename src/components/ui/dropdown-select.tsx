"use client";

import React, { useState, useRef, useEffect } from "react";
import { Check } from "lucide-react";
import { WorkspaceIcon } from "@/components/workspace-icons";

export interface DropdownOption {
  value: string;
  label: string;
  disabled?: boolean;
  badge?: string;
  badgeColor?: string;
  icon?: React.ReactNode;
  avatar?: {
    initials: string;
    colorClass: string;
  };
  desc?: string;
}

export interface DropdownSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: DropdownOption[];
  placeholder?: string;
  prefix?: string; // e.g. "Project:"
  className?: string;
  triggerClassName?: string;
  triggerPrefixIcon?: React.ReactNode;
  triggerTextClassName?: string;
  menuWidth?: string;
  align?: "left" | "right";
  direction?: "up" | "down";
  disabled?: boolean;
}

export const DropdownSelect: React.FC<DropdownSelectProps> = ({
  value,
  onChange,
  options,
  placeholder = "Select...",
  prefix,
  className = "",
  triggerClassName = "",
  triggerPrefixIcon,
  triggerTextClassName,
  menuWidth = "min-w-[210px] w-full sm:w-auto",
  align = "left",
  direction = "down",
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on click outside or Escape key
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const selectedOption = options.find((opt) => opt.value === value);

  const handleSelect = (val: string) => {
    onChange(val);
    setIsOpen(false);
    requestAnimationFrame(() =>
      containerRef.current?.querySelector<HTMLButtonElement>("button")?.focus(),
    );
  };

  return (
    <div
      ref={containerRef}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          setIsOpen(false);
          containerRef.current
            ?.querySelector<HTMLButtonElement>("button")
            ?.focus();
        }
        if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
        event.preventDefault();
        if (!isOpen) {
          if (disabled) return;
          setIsOpen(true);
          requestAnimationFrame(() =>
            containerRef.current
              ?.querySelector<HTMLButtonElement>(
                'button[role="option"]:not([disabled])',
              )
              ?.focus(),
          );
          return;
        }
        const buttons = Array.from(
          containerRef.current?.querySelectorAll<HTMLButtonElement>(
            'button[role="option"]:not([disabled])',
          ) || [],
        );
        const index = buttons.indexOf(
          document.activeElement as HTMLButtonElement,
        );
        buttons[
          (index + (event.key === "ArrowDown" ? 1 : buttons.length - 1)) %
            buttons.length
        ]?.focus();
      }}
      className={`relative inline-block text-left ${className}`}
    >
      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className={`group flex items-center justify-between gap-2.5 h-9 px-3.5 rounded-xl border bg-white text-xs font-medium text-slate-700 shadow-2xs hover:border-slate-300 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-codex-accent/20 transition-all select-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
          isOpen
            ? "border-slate-400 ring-2 ring-codex-accent/15"
            : "border-codex-border/90"
        } ${triggerClassName}`}
      >
        <div className="flex items-center gap-2 truncate min-w-0 pr-1">
          {triggerPrefixIcon && (
            <span className="shrink-0">{triggerPrefixIcon}</span>
          )}
          {!triggerPrefixIcon && selectedOption?.avatar && (
            <div
              className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0 ${selectedOption.avatar.colorClass}`}
            >
              {selectedOption.avatar.initials}
            </div>
          )}
          {!triggerPrefixIcon && selectedOption?.icon && (
            <span className="shrink-0 text-slate-500">
              {selectedOption.icon}
            </span>
          )}
          {selectedOption?.badge && (
            <span
              className={`inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-mono font-semibold shrink-0 ${
                selectedOption.badgeColor ||
                "bg-blue-50 text-blue-700 border border-blue-200"
              }`}
            >
              {selectedOption.badge}
            </span>
          )}
          <span className="truncate">
            {prefix && (
              <span className="text-slate-500 font-normal mr-1">{prefix}</span>
            )}
            <span
              className={triggerTextClassName || "font-semibold text-slate-800"}
            >
              {selectedOption ? selectedOption.label : placeholder}
            </span>
          </span>
        </div>

        <WorkspaceIcon
          name="chevron"
          className={`w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600 shrink-0 transition-transform duration-150 ${
            isOpen ? "rotate-180 text-codex-accent" : ""
          }`}
        />
      </button>

      {/* Floating Menu */}
      {isOpen && (
        <div
          role="listbox"
          className={`absolute ${align === "right" ? "right-0" : "left-0"} ${
            direction === "up"
              ? "bottom-full mb-2 origin-bottom"
              : "top-full mt-1.5 origin-top"
          } ${menuWidth} max-h-72 overflow-y-auto bg-white rounded-2xl shadow-xl shadow-slate-900/10 border border-slate-200/90 p-1.5 z-50 animate-in fade-in zoom-in-95 duration-100 [scrollbar-width:thin] [scrollbar-color:rgba(0,0,0,0.12)_transparent]`}
        >
          <div className="space-y-0.5">
            {options.map((opt) => {
              const isSelected = opt.value === value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  disabled={opt.disabled}
                  onClick={() => !opt.disabled && handleSelect(opt.value)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs transition-all text-left group cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                    isSelected
                      ? "bg-blue-50/80 text-blue-700 font-semibold border border-blue-200/60 shadow-2xs"
                      : "text-slate-700 hover:bg-slate-50 border border-transparent font-medium"
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate min-w-0 pr-2">
                    {opt.avatar && (
                      <div
                        className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0 ${opt.avatar.colorClass}`}
                      >
                        {opt.avatar.initials}
                      </div>
                    )}
                    {opt.icon && (
                      <span className="shrink-0 text-slate-400 group-hover:text-slate-600">
                        {opt.icon}
                      </span>
                    )}
                    {opt.badge && (
                      <span
                        className={`inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-mono font-semibold shrink-0 ${
                          opt.badgeColor ||
                          "bg-blue-50 text-blue-700 border border-blue-200"
                        }`}
                      >
                        {opt.badge}
                      </span>
                    )}
                    <div className="truncate min-w-0">
                      <div className="truncate">{opt.label}</div>
                      {opt.desc && (
                        <div className="text-[10px] text-slate-400 truncate font-normal">
                          {opt.desc}
                        </div>
                      )}
                    </div>
                  </div>

                  {isSelected && (
                    <Check className="w-3.5 h-3.5 text-blue-600 stroke-[2.5] shrink-0 ml-2" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
