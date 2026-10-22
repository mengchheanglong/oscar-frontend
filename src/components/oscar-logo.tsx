"use client";

import React from "react";
import { OSCAR_MARK_PATH } from "@/lib/oscar-brand";

interface OscarMarkProps {
  className?: string;
  size?: number | string;
}

/** Monochrome infinity ribbon shared with the sidebar and app icon. */
export const OscarMark: React.FC<OscarMarkProps> = ({
  className = "w-7 h-7",
  size,
}) => (
  <svg
    viewBox="0 0 64 64"
    fill="currentColor"
    xmlns="http://www.w3.org/2000/svg"
    className={`shrink-0 ${className}`}
    width={size}
    height={size}
    aria-hidden="true"
  >
    <path d={OSCAR_MARK_PATH} />
  </svg>
);

interface OscarIconProps {
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
  variant?: "glyph" | "card";
}

/**
 * Standalone App Icon:
 * - 'glyph': Standalone scalable emblem mark
 * - 'card': Emblem nested inside a premium dark rounded squircle tile (#161927)
 */
export const OscarIcon: React.FC<OscarIconProps> = ({
  className = "",
  size = "md",
  variant = "card",
}) => {
  const sizeMap = {
    sm: { box: "w-7 h-7 rounded-lg", mark: "w-5 h-5" },
    md: { box: "w-8 h-8 rounded-xl", mark: "w-6 h-6" },
    lg: { box: "w-10 h-10 rounded-xl", mark: "w-7 h-7" },
    xl: { box: "w-12 h-12 rounded-2xl", mark: "w-9 h-9" },
  };

  const { box, mark } = sizeMap[size] || sizeMap.md;

  if (variant === "glyph") {
    return (
      <div
        className={`inline-flex items-center justify-center shrink-0 ${className}`}
      >
        <OscarMark className={mark} />
      </div>
    );
  }

  return (
    <div
      className={`inline-flex items-center justify-center bg-[#161927] border border-white/10 shadow-md shrink-0 transition-transform ${box} ${className}`}
      role="img"
      aria-label="OSCAR Icon"
    >
      <OscarMark className={mark} />
    </div>
  );
};

interface OscarLogoProps {
  className?: string;
  showText?: boolean;
  textClassName?: string;
  size?: "sm" | "md" | "lg";
}

/**
 * Full OSCAR Brand Logo:
 * Renders the infinity emblem paired with the crisp bold "OSCAR" wordmark.
 */
export const OscarLogo: React.FC<OscarLogoProps> = ({
  className = "",
  showText = true,
  textClassName = "",
  size = "md",
}) => {
  const sizeConfig = {
    sm: { mark: "w-6 h-6", text: "text-base font-bold tracking-tight" },
    md: { mark: "w-7 h-7", text: "text-lg font-bold tracking-tight" },
    lg: { mark: "w-10 h-10", text: "text-2xl font-extrabold tracking-tight" },
  };

  const { mark, text } = sizeConfig[size] || sizeConfig.md;

  return (
    <div
      className={`inline-flex items-center gap-2 select-none ${className}`}
      role="img"
      aria-label="OSCAR"
    >
      <OscarMark className={mark} />
      {showText && (
        <span
          className={`text-current font-sans ${text} ${textClassName}`}
          style={{ letterSpacing: "-0.03em" }}
        >
          OSCAR
        </span>
      )}
    </div>
  );
};

export default OscarLogo;
