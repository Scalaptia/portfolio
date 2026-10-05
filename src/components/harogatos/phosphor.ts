// The tube's colours, and the CSS that makes text look like it is lit rather than printed.

export const PHOSPHOR = {
  green: { bg: "#001100", fg: "#00FF41", dim: "rgba(0, 255, 65, 0.16)", glow: "rgba(0, 255, 65, 0.55)" },
  amber: { bg: "#110800", fg: "#FFB000", dim: "rgba(255, 176, 0, 0.16)", glow: "rgba(255, 176, 0, 0.55)" },
} as const;

export type Phosphor = (typeof PHOSPHOR)[keyof typeof PHOSPHOR];

/** Custom properties for a screen. Children read var(--fg) and friends. */
export const phosphorVars = (p: Phosphor) =>
  ({
    "--fg": p.fg,
    "--bg": p.bg,
    "--dim": p.dim,
    "--glow": p.glow,
    "--crt-glow": p.glow,
    background: p.bg,
    color: p.fg,
    textShadow: `0 0 0.45em ${p.glow}`,
  }) as React.CSSProperties;

// Selected rows and title bars are drawn in reverse video, like every menu on every old terminal.
export const INVERSE = "bg-[var(--fg)] text-[var(--bg)] [text-shadow:none]";

export const calmMotion = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
