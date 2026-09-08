"use client";

import Link from "next/link";
import { SpinnerIcon } from "./Icons";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "success";
type Size = "sm" | "md" | "lg";

const VARIANTS: Record<Variant, string> = {
  primary:
    "bg-sui-600 text-white shadow-sm shadow-sui-600/20 hover:bg-sui-700 active:bg-sui-800 disabled:hover:bg-sui-600",
  secondary:
    "bg-white text-ink-800 border border-ink-300 hover:bg-ink-50 hover:border-ink-400 active:bg-ink-100 disabled:hover:bg-white",
  ghost:
    "bg-transparent text-ink-600 hover:bg-ink-100 hover:text-ink-900 active:bg-ink-200",
  danger:
    "bg-white text-red-700 border border-red-200 hover:bg-red-50 hover:border-red-300 active:bg-red-100 disabled:hover:bg-white",
  success:
    "bg-emerald-600 text-white shadow-sm shadow-emerald-600/20 hover:bg-emerald-700 active:bg-emerald-800 disabled:hover:bg-emerald-600",
};

const SIZES: Record<Size, string> = {
  sm: "h-8 px-3 text-xs gap-1.5 rounded-lg",
  md: "h-10 px-4 text-sm gap-2 rounded-lg",
  lg: "h-12 px-6 text-base gap-2 rounded-xl",
};

const BASE =
  "inline-flex items-center justify-center font-medium transition-colors select-none " +
  "disabled:opacity-50 disabled:cursor-not-allowed";

export function buttonClass(variant: Variant = "primary", size: Size = "md", extra = "") {
  return `${BASE} ${VARIANTS[variant]} ${SIZES[size]} ${extra}`;
}

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  /** Rendered before the label; hidden while `loading` swaps in the spinner. */
  icon?: React.ReactNode;
  fullWidth?: boolean;
}

export default function Button({
  variant = "primary", size = "md", loading = false, icon,
  fullWidth = false, className = "", children, disabled, ...rest
}: ButtonProps) {
  return (
    <button
      {...rest}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={buttonClass(variant, size, `${fullWidth ? "w-full" : ""} ${className}`)}
    >
      {loading ? <SpinnerIcon /> : icon}
      {children}
    </button>
  );
}

interface LinkButtonProps extends React.ComponentProps<typeof Link> {
  variant?: Variant;
  size?: Size;
  icon?: React.ReactNode;
}

export function LinkButton({
  variant = "primary", size = "md", icon, className = "", children, ...rest
}: LinkButtonProps) {
  return (
    <Link {...rest} className={buttonClass(variant, size, className)}>
      {icon}
      {children}
    </Link>
  );
}
