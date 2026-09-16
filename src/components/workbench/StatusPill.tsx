import React from "react";

export type StatusVariant =
  | "neutral"
  | "accent"
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "purple";

export interface StatusPillProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: StatusVariant;
  size?: "xs" | "sm" | "md";
  icon?: React.ComponentType<{ className?: string }>;
  dot?: boolean;
  pulse?: boolean;
  children: React.ReactNode;
}

const variantStyles: Record<StatusVariant, string> = {
  neutral:
    "bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 border-stone-200 dark:border-stone-700",
  accent:
    "bg-amber-100 dark:bg-amber-950/80 text-amber-900 dark:text-amber-300 border-amber-300/80 dark:border-amber-700/80",
  success:
    "bg-emerald-50 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 border-emerald-300/80 dark:border-emerald-700/80",
  warning:
    "bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-700",
  danger:
    "bg-rose-50 dark:bg-rose-950/70 text-rose-800 dark:text-rose-300 border-rose-300/80 dark:border-rose-700/80",
  info:
    "bg-sky-50 dark:bg-sky-950/70 text-sky-800 dark:text-sky-300 border-sky-300/80 dark:border-sky-700/80",
  purple:
    "bg-purple-50 dark:bg-purple-950/70 text-purple-800 dark:text-purple-300 border-purple-300/80 dark:border-purple-700/80",
};

const dotColorStyles: Record<StatusVariant, string> = {
  neutral: "bg-stone-400 dark:bg-stone-500",
  accent: "bg-amber-600 dark:bg-amber-400",
  success: "bg-emerald-600 dark:bg-emerald-400",
  warning: "bg-amber-500 dark:bg-amber-400",
  danger: "bg-rose-600 dark:bg-rose-400",
  info: "bg-sky-600 dark:bg-sky-400",
  purple: "bg-purple-600 dark:bg-purple-400",
};

const sizeStyles: Record<"xs" | "sm" | "md", string> = {
  xs: "text-[10px] px-2 py-0.5 gap-1 font-medium",
  sm: "text-xs px-2.5 py-1 gap-1.5 font-semibold",
  md: "text-xs px-3 py-1.5 gap-1.5 font-semibold",
};

export function StatusPill({
  variant = "neutral",
  size = "xs",
  icon: Icon,
  dot = false,
  pulse = false,
  className = "",
  children,
  ...props
}: StatusPillProps) {
  const classes = [
    "inline-flex items-center rounded-full border tracking-wide select-none",
    variantStyles[variant],
    sizeStyles[size],
    className,
  ].filter(Boolean).join(" ");

  const dotClasses = [
    "w-1.5 h-1.5 rounded-full",
    dotColorStyles[variant],
    pulse ? "animate-pulse" : "",
  ].filter(Boolean).join(" ");

  return (
    <span className={classes} {...props}>
      {dot ? <span className={dotClasses} aria-hidden="true"></span> : null}
      {Icon ? <Icon className="w-3 h-3 shrink-0" aria-hidden="true" /> : null}
      <span>{children}</span>
    </span>
  );
}
