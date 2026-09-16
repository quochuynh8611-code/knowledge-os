import React from 'react';

export interface SplitPaneProps extends React.HTMLAttributes<HTMLDivElement> {
  left: React.ReactNode;
  right: React.ReactNode;
  ratio?: '50/50' | '40/60' | '30/70' | '60/40' | '70/30' | 'sidebar';
  stackedOnMobile?: boolean;
}

const ratioStyles: Record<
  '50/50' | '40/60' | '30/70' | '60/40' | '70/30' | 'sidebar',
  { left: string; right: string }
> = {
  '50/50': { left: 'md:w-1/2', right: 'md:w-1/2' },
  '40/60': { left: 'md:w-2/5', right: 'md:w-3/5' },
  '30/70': { left: 'md:w-[32%]', right: 'md:w-[68%]' },
  '60/40': { left: 'md:w-3/5', right: 'md:w-2/5' },
  '70/30': { left: 'md:w-[68%]', right: 'md:w-[32%]' },
  sidebar: { left: 'md:w-72 lg:w-80 shrink-0', right: 'flex-1 min-w-0' },
};

export function SplitPane({
  left,
  right,
  ratio = 'sidebar',
  stackedOnMobile = true,
  className = '',
  ...props
}: SplitPaneProps) {
  const config = ratioStyles[ratio];

  return (
    <div
      className={`flex ${stackedOnMobile ? 'flex-col md:flex-row' : 'flex-row'} gap-4 sm:gap-6 ${className}`}
      {...props}
    >
      <div className={`${config.left} min-w-0`}>{left}</div>
      <div className={`${config.right} min-w-0`}>{right}</div>
    </div>
  );
}
