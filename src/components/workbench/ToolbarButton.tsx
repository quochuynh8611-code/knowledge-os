import React from 'react';

export type ToolbarButtonVariant =
  | 'primary'
  | 'secondary'
  | 'outline'
  | 'ghost'
  | 'danger'
  | 'accent';

export type ToolbarButtonSize = 'xs' | 'sm' | 'md';

export interface ToolbarButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ToolbarButtonVariant;
  size?: ToolbarButtonSize;
  icon?: React.ComponentType<{ className?: string }>;
  trailingIcon?: React.ComponentType<{ className?: string }>;
  shortcut?: string;
  loading?: boolean;
  active?: boolean;
  children?: React.ReactNode;
}

const variantStyles: Record<ToolbarButtonVariant, string> = {
  primary:
    'bg-amber-800 hover:bg-amber-900 text-amber-50 shadow-2xs font-semibold border border-amber-900/60',
  secondary:
    'bg-stone-100 hover:bg-stone-200/90 dark:bg-stone-800 dark:hover:bg-stone-750 text-stone-800 dark:text-stone-200 border border-stone-200 dark:border-stone-700 font-medium',
  outline:
    'bg-transparent hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-300 border border-stone-300 dark:border-stone-700 font-medium',
  ghost:
    'bg-transparent hover:bg-stone-100/80 dark:hover:bg-stone-800/80 text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 border border-transparent font-medium',
  danger:
    'bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/60 dark:hover:bg-rose-900/70 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800/80 font-medium',
  accent:
    'bg-amber-100 hover:bg-amber-200/80 dark:bg-amber-950/80 dark:hover:bg-amber-900 text-amber-950 dark:text-amber-200 border border-amber-300/80 dark:border-amber-700/80 font-semibold',
};

const activeStyles: Record<ToolbarButtonVariant, string> = {
  primary: 'ring-2 ring-amber-500 ring-offset-1',
  secondary: 'bg-stone-200 dark:bg-stone-700 border-stone-400 dark:border-stone-500',
  outline: 'bg-stone-100 dark:bg-stone-800 border-stone-400 dark:border-stone-500',
  ghost: 'bg-stone-200/80 dark:bg-stone-800 text-stone-900 dark:text-stone-100',
  danger: 'bg-rose-100 dark:bg-rose-900 border-rose-400',
  accent: 'bg-amber-200 dark:bg-amber-900 border-amber-500',
};

const sizeStyles: Record<ToolbarButtonSize, string> = {
  xs: 'px-2 py-1 text-[11px] gap-1 rounded-lg',
  sm: 'px-2.5 py-1.5 text-xs gap-1.5 rounded-xl',
  md: 'px-3.5 py-2 text-xs sm:text-sm gap-2 rounded-xl',
};

export function ToolbarButton({
  variant = 'secondary',
  size = 'sm',
  icon: Icon,
  trailingIcon: TrailingIcon,
  shortcut,
  loading = false,
  active = false,
  disabled,
  className = '',
  children,
  ...props
}: ToolbarButtonProps) {
  return (
    <button
      type="button"
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center transition-all duration-150 select-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${variantStyles[variant]} ${active ? activeStyles[variant] : ''} ${sizeStyles[size]} ${className}`}
      {...props}
    >
      {loading ? (
        <span className="w-3.5 h-3.5 rounded-full border-2 border-current border-t-transparent animate-spin shrink-0" />
      ) : Icon ? (
        <Icon className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
      ) : null}

      {children && <span>{children}</span>}

      {TrailingIcon && (
        <TrailingIcon className="w-3.5 h-3.5 shrink-0 opacity-70" aria-hidden="true" />
      )}

      {shortcut && (
        <kbd className="hidden sm:inline-block px-1 py-0.2 font-mono text-[9px] bg-black/5 dark:bg-white/10 rounded border border-black/10 dark:border-white/10 opacity-70">
          {shortcut}
        </kbd>
      )}
    </button>
  );
}
