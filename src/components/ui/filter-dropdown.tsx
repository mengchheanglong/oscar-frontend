"use client";

import { WorkspaceIcon } from "@/components/workspace-icons";
import React, { useState, useRef, useEffect } from "react";
import { ChevronDown, Check } from "lucide-react";

export interface FilterOption {
  value: string;
  label: string;
  color?: string; // Dot color (e.g. "#C0392B", "#8B5CF6", etc.)
  textColor?: string; // Text color (hex code e.g. "#D32F2F" or tailwind class)
}

export interface FilterDropdownProps {
  label: string; // e.g. "Type", "Project", "Assignee", "Priority", "Status", "Uploaded by"
  allLabel?: string; // e.g. "All types", "All projects", "Everyone", "All priorities", "All statuses"
  value: string;
  onChange: (value: string) => void;
  options: FilterOption[];
  className?: string;
  menuWidth?: string; // optional min-width for the menu, defaults to min-w-[200px]
}

export const FilterDropdown: React.FC<FilterDropdownProps> = ({
  label,
  allLabel,
  value,
  onChange,
  options,
  className = "",
  menuWidth = "min-w-[200px]",
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on click outside or escape key
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
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

  const isAll = value === "ALL" || value === "" || value === undefined;

  // Selected option text
  const selectedOption = options.find((opt) => opt.value === value);
  const displayValue = isAll ? "All" : selectedOption?.label || value;

  const defaultAllLabel =
    allLabel ||
    (label.toLowerCase() === "assignee" || label.toLowerCase() === "uploaded by"
      ? "Everyone"
      : `All ${label.toLowerCase()}s`);

  const handleSelect = (val: string) => {
    onChange(val);
    setIsOpen(false);
  };

  // State styling matching user reference:
  // 1. Filtered (not "ALL"): lavender background `#EEF2FF`, indigo border `#6366F1`, indigo text `#4F46E5`
  // 2. Unfiltered & Open: white background, dark border `border-slate-800`, text `text-slate-900`
  // 3. Default idle: white background, subtle border `border-slate-200`, text `text-slate-800`, hover:border-slate-800
  const isFiltered = !isAll;
  const buttonStyle = isFiltered
    ? "bg-[var(--ws-hover)] border-codex-border text-codex-text"
    : isOpen
    ? "bg-white border-slate-800 text-slate-900 shadow-xs"
    : "bg-white border-slate-200 text-slate-800 hover:border-slate-800 hover:text-slate-900";

  return (
    <div ref={containerRef} className={`relative inline-block text-left ${className}`}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className={`h-9 px-3.5 rounded-lg text-[13px] font-medium transition-all duration-150 flex items-center justify-between gap-2.5 shadow-2xs cursor-pointer select-none outline-none border ${buttonStyle}`}
      >
        <span className="truncate max-w-[170px]">
          {label}: {displayValue}
        </span>
        <WorkspaceIcon name="chevron"
          className={`w-4 h-4 shrink-0 transition-transform duration-200 ${
            isFiltered ? "text-[#4F46E5]" : "text-slate-400"
          } ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {/* Floating Dropdown Menu */}
      {isOpen && (
        <div
          role="listbox"
          className={`absolute left-0 top-full mt-1.5 ${menuWidth} max-h-72 overflow-y-auto bg-white rounded-xl shadow-xl border border-slate-100 p-1.5 z-50 animate-in fade-in zoom-in-95 duration-100 [scrollbar-width:thin] [scrollbar-color:rgba(0,0,0,0.15)_transparent]`}
        >
          {/* "All" Option */}
          <button
            type="button"
            role="option"
            aria-selected={isAll}
            onClick={() => handleSelect("ALL")}
            className="w-full flex items-center justify-between px-3 py-2 text-[13px] font-medium text-[#4361EE] hover:bg-slate-50 rounded-lg cursor-pointer transition-colors text-left group"
          >
            <span>{defaultAllLabel}</span>
            {isAll && <Check className="w-4 h-4 text-[#4361EE] stroke-[2.5]" />}
          </button>

          {/* Option Items */}
          <div className="space-y-0.5 pt-0.5">
            {options.map((opt) => {
              const isSelected = value === opt.value;
              const isHexColor = opt.textColor && opt.textColor.startsWith("#");

              return (
                <button
                  key={opt.value}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => handleSelect(opt.value)}
                  className="w-full flex items-center justify-between px-3 py-2 text-[13px] rounded-lg hover:bg-slate-50 cursor-pointer transition-colors text-left group"
                >
                  <div className="flex items-center gap-2.5 min-w-0 pr-2">
                    {opt.color && (
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0 shadow-2xs"
                        style={{ backgroundColor: opt.color }}
                      />
                    )}
                    <span
                      className={`truncate ${
                        !opt.textColor
                          ? isSelected
                            ? "text-slate-900 font-medium"
                            : "text-slate-800 font-normal"
                          : !isHexColor
                          ? opt.textColor
                          : ""
                      }`}
                      style={isHexColor ? { color: opt.textColor } : undefined}
                    >
                      {opt.label}
                    </span>
                  </div>

                  {isSelected && <Check className="w-4 h-4 text-[#4361EE] stroke-[2.5] shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
