import React, { useEffect } from 'react';
import { X } from 'lucide-react';

export interface ModalFrameProps {
  isOpen: boolean;
  onClose: () => void;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  icon?: React.ComponentType<{ className?: string }>;
  headerBadge?: React.ReactNode;
  headerActions?: React.ReactNode;
  footerActions?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
  children: React.ReactNode;
}

const sizeWidthStyles: Record<'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full', string> = {
  sm: 'max-w-md',
  md: 'max-w-xl',
  lg: 'max-w-3xl',
  xl: 'max-w-5xl',
  '2xl': 'max-w-6xl',
  full: 'max-w-[96vw] h-[92vh]',
};

export function ModalFrame({
  isOpen,
  onClose,
  title,
  subtitle,
  icon: Icon,
  headerBadge,
  headerActions,
  footerActions,
  size = 'lg',
  children,
}: ModalFrameProps) {
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-stone-950/60 backdrop-blur-xs transition-opacity duration-200"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Dialog Content */}
      <div
        role="dialog"
        aria-modal="true"
        className={`relative z-10 w-full ${sizeWidthStyles[size]} max-h-[92vh] flex flex-col bg-white dark:bg-stone-900 rounded-2xl shadow-2xl border border-stone-200/90 dark:border-stone-800 overflow-hidden animate-in fade-in zoom-in-98 duration-150`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 sm:px-6 sm:py-4 border-b border-stone-200/80 dark:border-stone-800 bg-stone-50/70 dark:bg-stone-900/80 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            {Icon && (
              <div className="p-2 rounded-xl bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-400 shrink-0">
                <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
            )}
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-stone-900 dark:text-stone-100 truncate font-serif-title">
                  {title}
                </h2>
                {headerBadge}
              </div>
              {subtitle && (
                <p className="text-xs text-stone-500 dark:text-stone-400 truncate">
                  {subtitle}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {headerActions}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-200/60 dark:hover:bg-stone-800 rounded-xl transition cursor-pointer"
              title="Đóng (Esc)"
              aria-label="Đóng hộp thoại"
            >
              <X className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
          {children}
        </div>

        {/* Footer */}
        {footerActions && (
          <div className="px-5 py-3.5 sm:px-6 sm:py-4 border-t border-stone-200/80 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-900/60 flex items-center justify-end gap-2.5 shrink-0">
            {footerActions}
          </div>
        )}
      </div>
    </div>
  );
}
