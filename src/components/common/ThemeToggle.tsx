import React from 'react';
import { Sun, Moon, Laptop } from 'lucide-react';
import { useTheme, Theme } from '../../hooks/useTheme';

export interface ThemeToggleProps {
  variant?: 'button' | 'dropdown' | 'segmented';
  className?: string;
  showLabel?: boolean;
}

export function ThemeToggle({
  variant = 'button',
  className = '',
  showLabel = false,
}: ThemeToggleProps) {
  const { theme, resolvedTheme, setTheme, toggleTheme, isDark } = useTheme();

  if (variant === 'segmented') {
    const options: { id: Theme; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
      { id: 'light', label: 'Sáng (Giấy cổ)', icon: Sun },
      { id: 'dark', label: 'Tối (Mực nho)', icon: Moon },
      { id: 'system', label: 'Hệ thống', icon: Laptop },
    ];

    return (
      <div
        role="radiogroup"
        aria-label="Chọn giao diện hiển thị"
        className={`inline-flex items-center p-1 bg-stone-200/70 dark:bg-stone-800/80 rounded-xl border border-stone-300/80 dark:border-stone-700 ${className}`}
      >
        {options.map((opt) => {
          const Icon = opt.icon;
          const isSelected = theme === opt.id;
          return (
            <button
              key={opt.id}
              role="radio"
              aria-checked={isSelected}
              onClick={() => setTheme(opt.id)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                isSelected
                  ? 'bg-white dark:bg-stone-900 text-amber-900 dark:text-amber-400 shadow-2xs'
                  : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200'
              }`}
              title={opt.label}
            >
              <Icon className="w-3.5 h-3.5" />
              {showLabel && <span>{opt.label}</span>}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={`Chuyển sang giao diện ${isDark ? 'Sáng (Giấy cổ)' : 'Tối (Mực nho)'}`}
      title={`Đang dùng giao diện ${isDark ? 'Tối' : 'Sáng'}. Nhấp để đổi`}
      className={`relative p-2 text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:hover:text-white hover:bg-stone-200/60 dark:hover:bg-stone-800 rounded-xl transition flex items-center gap-2 ${className}`}
    >
      {isDark ? (
        <Sun className="w-4 h-4 text-amber-400 animate-in fade-in zoom-in duration-200" />
      ) : (
        <Moon className="w-4 h-4 text-stone-600 animate-in fade-in zoom-in duration-200" />
      )}
      {showLabel && (
        <span className="text-xs font-medium">
          {isDark ? 'Giao diện Tối' : 'Giao diện Sáng'}
        </span>
      )}
    </button>
  );
}
