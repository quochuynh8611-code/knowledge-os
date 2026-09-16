import React from 'react';

export type SurfaceCardVariant =
  | 'default'
  | 'subtle'
  | 'elevated'
  | 'outlined'
  | 'interactive'
  | 'active';

export interface SurfaceCardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: SurfaceCardVariant;
  padding?: 'none' | 'xs' | 'sm' | 'md' | 'lg';
  radius?: 'md' | 'lg' | 'xl' | '2xl';
  children: React.ReactNode;
}

const variantStyles: Record<SurfaceCardVariant, string> = {
  default:
    'bg-white dark:bg-stone-900/90 border border-stone-200/80 dark:border-stone-800 shadow-2xs',
  subtle:
    'bg-stone-50/80 dark:bg-stone-900/60 border border-stone-200/60 dark:border-stone-800/80',
  elevated:
    'bg-white dark:bg-stone-900 border border-stone-200/90 dark:border-stone-750 shadow-xs',
  outlined:
    'bg-transparent border border-stone-300/80 dark:border-stone-700',
  interactive:
    'bg-white dark:bg-stone-900/90 border border-stone-200/80 dark:border-stone-800 hover:border-stone-300 dark:hover:border-stone-700 hover:shadow-xs transition-all duration-150 cursor-pointer',
  active:
    'bg-amber-50/70 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700 shadow-2xs',
};

const paddingStyles: Record<'none' | 'xs' | 'sm' | 'md' | 'lg', string> = {
  none: '',
  xs: 'p-2 sm:p-2.5',
  sm: 'p-3 sm:p-4',
  md: 'p-4 sm:p-5',
  lg: 'p-5 sm:p-6 lg:p-7',
};

const radiusStyles: Record<'md' | 'lg' | 'xl' | '2xl', string> = {
  md: 'rounded-lg',
  lg: 'rounded-xl',
  xl: 'rounded-2xl',
  '2xl': 'rounded-3xl',
};

export function SurfaceCard({
  variant = 'default',
  padding = 'md',
  radius = 'xl',
  className = '',
  children,
  ...props
}: SurfaceCardProps) {
  return (
    <div
      className={`${variantStyles[variant]} ${paddingStyles[padding]} ${radiusStyles[radius]} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
