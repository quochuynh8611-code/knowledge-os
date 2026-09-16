import React from 'react';

export interface ActionBarProps extends React.HTMLAttributes<HTMLDivElement> {
  align?: 'start' | 'center' | 'end' | 'between';
  gap?: 'xs' | 'sm' | 'md';
  wrap?: boolean;
  children: React.ReactNode;
}

const alignStyles: Record<'start' | 'center' | 'end' | 'between', string> = {
  start: 'justify-start',
  center: 'justify-center',
  end: 'justify-end',
  between: 'justify-between',
};

const gapStyles: Record<'xs' | 'sm' | 'md', string> = {
  xs: 'gap-1',
  sm: 'gap-1.5 sm:gap-2',
  md: 'gap-2 sm:gap-3',
};

export function ActionBar({
  align = 'end',
  gap = 'sm',
  wrap = true,
  className = '',
  children,
  ...props
}: ActionBarProps) {
  return (
    <div
      className={`flex items-center ${alignStyles[align]} ${gapStyles[gap]} ${wrap ? 'flex-wrap' : 'flex-nowrap'} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
