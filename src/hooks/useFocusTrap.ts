import { useEffect, useRef } from 'react';

export interface UseFocusTrapOptions {
  /** Initial element to focus when trap activates. If omitted, focuses the first focusable element. */
  initialFocusRef?: React.RefObject<HTMLElement | null>;
  /** Whether to restore focus to previously active element on deactivate. Defaults to true. */
  returnFocus?: boolean;
  /** Callback when Escape key is pressed */
  onEscape?: () => void;
}

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled]):not([aria-hidden="true"])',
  'input:not([disabled]):not([type="hidden"]):not([aria-hidden="true"])',
  'select:not([disabled]):not([aria-hidden="true"])',
  'textarea:not([disabled]):not([aria-hidden="true"])',
  '[tabindex]:not([tabindex="-1"]):not([aria-hidden="true"])',
].join(', ');

export function getFocusableElements(container: HTMLElement): HTMLElement[] {
  const elements = Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
  return elements.filter((el) => {
    return (
      el.getAttribute('aria-hidden') !== 'true' &&
      !el.hasAttribute('disabled') &&
      (el.offsetParent !== null ||
        el.offsetWidth > 0 ||
        el.offsetHeight > 0 ||
        (typeof window !== 'undefined' && window.getComputedStyle(el).display !== 'none'))
    );
  });
}

export function useFocusTrap(
  containerRef: React.RefObject<HTMLElement | null>,
  isActive: boolean,
  options: UseFocusTrapOptions = {}
) {
  const { initialFocusRef, returnFocus = true, onEscape } = options;
  const previousActiveElementRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isActive) return;

    // Capture currently focused element before activating
    previousActiveElementRef.current = document.activeElement as HTMLElement | null;

    const timer = setTimeout(() => {
      if (initialFocusRef?.current) {
        initialFocusRef.current.focus();
      } else if (containerRef.current) {
        const focusable = getFocusableElements(containerRef.current);
        if (focusable.length > 0) {
          focusable[0].focus();
        } else {
          containerRef.current.focus();
        }
      }
    }, 20);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (!containerRef.current) return;

      if (e.key === 'Escape' && onEscape) {
        e.stopPropagation();
        onEscape();
        return;
      }

      if (e.key === 'Tab') {
        const focusable = getFocusableElements(containerRef.current);
        if (focusable.length === 0) {
          e.preventDefault();
          return;
        }

        const firstElement = focusable[0];
        const lastElement = focusable[focusable.length - 1];
        const activeElement = document.activeElement as HTMLElement | null;

        if (e.shiftKey) {
          // Shift + Tab: if on first element or focus is outside, wrap to last
          if (activeElement === firstElement || !containerRef.current.contains(activeElement)) {
            e.preventDefault();
            lastElement.focus();
          }
        } else {
          // Tab: if on last element or focus is outside, wrap to first
          if (activeElement === lastElement || !containerRef.current.contains(activeElement)) {
            e.preventDefault();
            firstElement.focus();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('keydown', handleKeyDown);
      if (
        returnFocus &&
        previousActiveElementRef.current &&
        typeof previousActiveElementRef.current.focus === 'function' &&
        previousActiveElementRef.current.isConnected
      ) {
        previousActiveElementRef.current.focus();
      }
    };
  }, [isActive, containerRef, initialFocusRef, returnFocus, onEscape]);
}
