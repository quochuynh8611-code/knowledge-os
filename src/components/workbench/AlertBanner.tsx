import React from 'react';
import {
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
  Info,
  X,
} from 'lucide-react';

export type AlertBannerVariant = 'info' | 'success' | 'warning' | 'error';

export interface AlertBannerProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  variant?: AlertBannerVariant;
  title?: React.ReactNode;
  onDismiss?: () => void;
  actions?: React.ReactNode;
  children: React.ReactNode;
}

const variantStyles: Record<
  AlertBannerVariant,
  {
    container: string;
    icon: React.ComponentType<{ className?: string }>;
    iconColor: string;
  }
> = {
  info: {
    container:
      'bg-sky-50 dark:bg-sky-950/50 border-sky-200 dark:border-sky-800/80 text-sky-900 dark:text-sky-200',
    icon: Info,
    iconColor: 'text-sky-700 dark:text-sky-400',
  },
  success: {
    container:
      'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-800/80 text-emerald-900 dark:text-emerald-200',
    icon: CheckCircle2,
    iconColor: 'text-emerald-700 dark:text-emerald-400',
  },
  warning: {
    container:
      'bg-amber-50 dark:bg-amber-950/50 border-amber-200 dark:border-amber-800/80 text-amber-900 dark:text-amber-200',
    icon: AlertTriangle,
    iconColor: 'text-amber-700 dark:text-amber-400',
  },
  error: {
    container:
      'bg-rose-50 dark:bg-rose-950/50 border-rose-200 dark:border-rose-800/80 text-rose-900 dark:text-rose-200',
    icon: AlertCircle,
    iconColor: 'text-rose-700 dark:text-rose-400',
  },
};

export function AlertBanner({
  variant = 'info',
  title,
  onDismiss,
  actions,
  className = '',
  children,
  ...props
}: AlertBannerProps) {
  const config = variantStyles[variant];
  const Icon = config.icon;

  return (
    <div
      role="alert"
      className={`p-3.5 sm:p-4 rounded-xl border flex items-start gap-3 text-xs sm:text-sm ${config.container} ${className}`}
      {...props}
    >
      <Icon className={`w-4 h-4 sm:w-5 sm:h-5 shrink-0 mt-0.5 ${config.iconColor}`} />

      <div className="flex-1 space-y-1">
        {title && <p className="font-bold">{title}</p>}
        <div className="leading-relaxed opacity-90">{children}</div>
        {actions && <div className="pt-1.5 flex items-center gap-2">{actions}</div>}
      </div>

      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          className="p-1 opacity-70 hover:opacity-100 rounded-lg transition shrink-0 cursor-pointer"
          title="Đóng thông báo"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
