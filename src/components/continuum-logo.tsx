"use client";

import React from "react";

export type PaletteId =
  | "sunset-vertical"
  | "cyber-cyan"
  | "brand-indigo"
  | "aurora-mint"
  | "solar-amber"
  | "pure-white";

export const PALETTES: Record<
  PaletteId,
  { name: string; stops: { offset: string; color: string }[] }
> = {
  "sunset-vertical": {
    name: "Vertical Sunset Spectrum",
    stops: [
      { offset: "0%", color: "#FF6B35" },
      { offset: "45%", color: "#E040FB" },
      { offset: "100%", color: "#00E5FF" },
    ],
  },
  "cyber-cyan": {
    name: "Electric Cyber Cyan",
    stops: [
      { offset: "0%", color: "#00F2FE" },
      { offset: "50%", color: "#4FACFE" },
      { offset: "100%", color: "#0052D4" },
    ],
  },
  "brand-indigo": {
    name: "Workspace Royal Indigo",
    stops: [
      { offset: "0%", color: "#818CF8" },
      { offset: "50%", color: "#4361EE" },
      { offset: "100%", color: "#6366F1" },
    ],
  },
  "aurora-mint": {
    name: "Aurora Mint Teal",
    stops: [
      { offset: "0%", color: "#00F5A0" },
      { offset: "50%", color: "#00D9E9" },
      { offset: "100%", color: "#38BDF8" },
    ],
  },
  "solar-amber": {
    name: "Solar Ember Orange",
    stops: [
      { offset: "0%", color: "#FBBF24" },
      { offset: "50%", color: "#F97316" },
      { offset: "100%", color: "#EF4444" },
    ],
  },
  "pure-white": {
    name: "Monochrome Platinum",
    stops: [
      { offset: "0%", color: "#F1F5F9" },
      { offset: "100%", color: "#FFFFFF" },
    ],
  },
};

interface ContinuumMarkProps {
  className?: string;
  size?: number | string;
  palette?: PaletteId;
}

/**
 * Concept 3: The Kinetic Facet (Selected by User)
 * - Precision white chevron 'A' on the left
 * - Floating vertical rounded intelligence pillar 'I' on the right
 */
export const ContinuumMark: React.FC<ContinuumMarkProps> = ({
  className = "w-7 h-5",
  size,
  palette = "cyber-cyan",
}) => {
  const currentPalette = PALETTES[palette] || PALETTES["cyber-cyan"];
  const gradId = `ai-grad-${palette}`;

  return (
    <svg
      viewBox="0 0 48 36"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 ${className}`}
      width={size}
      height={size}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={gradId} x1="0.5" y1="0" x2="0.5" y2="1">
          {currentPalette.stops.map((s, i) => (
            <stop key={i} offset={s.offset} stopColor={s.color} />
          ))}
        </linearGradient>
      </defs>

      {/* Dynamic architectural white A chevron */}
      <path d="M16 4H22L33 30H25.5L20 16L14.5 30H7L16 4Z" fill="#FFFFFF" />

      {/* Floating vertical rounded I-pillar */}
      <rect
        x="35"
        y="4"
        width="6"
        height="26"
        rx="3"
        fill={`url(#${gradId})`}
      />
    </svg>
  );
};

interface ContinuumIconProps {
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
  variant?: "glyph" | "card";
  palette?: PaletteId;
}

/**
 * Standalone App Icon:
 * - 'glyph': Standalone scalable emblem mark
 * - 'card': Emblem nested inside a premium dark rounded squircle tile (#161927)
 */
export const ContinuumIcon: React.FC<ContinuumIconProps> = ({
  className = "",
  size = "md",
  variant = "card",
  palette = "cyber-cyan",
}) => {
  const sizeMap = {
    sm: { box: "w-7 h-7 rounded-lg", mark: "w-5 h-4" },
    md: { box: "w-8 h-8 rounded-xl", mark: "w-6 h-4.5" },
    lg: { box: "w-10 h-10 rounded-xl", mark: "w-7 h-5" },
    xl: { box: "w-12 h-12 rounded-2xl", mark: "w-9 h-6" },
  };

  const { box, mark } = sizeMap[size] || sizeMap.md;

  if (variant === "glyph") {
    return (
      <div
        className={`inline-flex items-center justify-center shrink-0 ${className}`}
      >
        <ContinuumMark className={mark} palette={palette} />
      </div>
    );
  }

  return (
    <div
      className={`inline-flex items-center justify-center bg-[#161927] border border-white/10 shadow-md shrink-0 transition-transform ${box} ${className}`}
      role="img"
      aria-label="Continuum Icon"
    >
      <ContinuumMark className={mark} palette={palette} />
    </div>
  );
};

interface ContinuumLogoProps {
  className?: string;
  showText?: boolean;
  textClassName?: string;
  size?: "sm" | "md" | "lg";
  palette?: PaletteId;
}

/**
 * Full Continuum Brand Logo:
 * Renders the Concept 3 emblem paired with the crisp bold "Continuum" wordmark.
 */
export const ContinuumLogo: React.FC<ContinuumLogoProps> = ({
  className = "",
  showText = true,
  textClassName = "",
  size = "md",
  palette = "cyber-cyan",
}) => {
  const sizeConfig = {
    sm: { mark: "w-6 h-4.5", text: "text-base font-bold tracking-tight" },
    md: { mark: "w-7 h-5", text: "text-lg font-bold tracking-tight" },
    lg: { mark: "w-10 h-7", text: "text-2xl font-extrabold tracking-tight" },
  };

  const { mark, text } = sizeConfig[size] || sizeConfig.md;

  return (
    <div
      className={`inline-flex items-center gap-2 select-none ${className}`}
      role="img"
      aria-label="Continuum"
    >
      <ContinuumMark className={mark} palette={palette} />
      {showText && (
        <span
          className={`text-white font-sans ${text} ${textClassName}`}
          style={{ letterSpacing: "-0.03em" }}
        >
          Continuum
        </span>
      )}
    </div>
  );
};

export default ContinuumLogo;
