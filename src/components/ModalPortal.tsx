import React, { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';

export type ModalLevel = 'base' | 'elevated' | 'top';

const LEVEL_Z_INDEX: Record<ModalLevel, string> = {
  base: 'z-[1000]',
  elevated: 'z-[1100]',
  top: 'z-[1200]',
};

const activeModalStack: string[] = [];
let savedScrollState: {
  bodyOverflow: string;
  bodyPaddingRight: string;
  htmlOverflow: string;
} | null = null;

function getFocusableElements(root: HTMLElement | null): HTMLElement[] {
  if (!root) return [];
  const selectors = [
    'a[href]',
    'button:not([disabled])',
    'input:not([disabled]):not([type="hidden"])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
  ].join(',');

  return Array.from(root.querySelectorAll<HTMLElement>(selectors)).filter((el) => {
    if (el.getAttribute('aria-hidden') === 'true') return false;
    const style = window.getComputedStyle(el);
    return style.display !== 'none' && style.visibility !== 'hidden';
  });
}

export interface ModalPortalProps {
  isOpen: boolean;
  onClose?: () => void;
  children: React.ReactNode;
  level?: ModalLevel;
  labelledBy?: string;
  describedBy?: string;
  ariaLabel?: string;
  overlayClassName?: string;
  closeOnBackdropClick?: boolean;
  closeOnEscape?: boolean;
  lockScroll?: boolean;
  initialFocusRef?: React.RefObject<HTMLElement | null>;
}

/**
 * Viewport-level React Portal modal host.
 * - Mounts directly into document.body to bypass sidebar / overflow / transform stacking contexts.
 * - Reference-counts document scroll locking across stacked modals.
 * - Routes Escape key handling strictly to the top-most open modal.
 * - Captures and restores keyboard focus on close, with Tab containment.
 */
export default function ModalPortal({
  isOpen,
  onClose,
  children,
  level = 'base',
  labelledBy,
  describedBy,
  ariaLabel,
  overlayClassName = 'bg-slate-950/75 backdrop-blur-xs p-2 sm:p-4 lg:p-6',
  closeOnBackdropClick = true,
  closeOnEscape = true,
  lockScroll = true,
  initialFocusRef,
}: ModalPortalProps) {
  const modalId = useId();
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const previousActiveRef = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!isOpen || typeof document === 'undefined') return;

    previousActiveRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;

    if (!activeModalStack.includes(modalId)) {
      activeModalStack.push(modalId);
    }

    if (lockScroll && !savedScrollState) {
      const scrollbarWidth = Math.max(
        0,
        window.innerWidth - document.documentElement.clientWidth
      );
      savedScrollState = {
        bodyOverflow: document.body.style.overflow,
        bodyPaddingRight: document.body.style.paddingRight,
        htmlOverflow: document.documentElement.style.overflow,
      };
      document.documentElement.style.overflow = 'hidden';
      document.body.style.overflow = 'hidden';
      if (scrollbarWidth > 0) {
        const computedPadding = parseFloat(
          window.getComputedStyle(document.body).paddingRight || '0'
        );
        document.body.style.paddingRight = `${computedPadding + scrollbarWidth}px`;
      }
    }

    const rafFocus = window.requestAnimationFrame(() => {
      const overlayEl = overlayRef.current;
      if (!overlayEl) return;

      if (initialFocusRef?.current && overlayEl.contains(initialFocusRef.current)) {
        initialFocusRef.current.focus({ preventScroll: true });
        return;
      }

      if (
        document.activeElement instanceof HTMLElement &&
        overlayEl.contains(document.activeElement)
      ) {
        return;
      }

      overlayEl.focus({ preventScroll: true });
    });

    const handleKeyDown = (event: KeyboardEvent) => {
      if (activeModalStack[activeModalStack.length - 1] !== modalId) return;

      if (event.key === 'Escape' && closeOnEscape && onCloseRef.current) {
        event.preventDefault();
        event.stopPropagation();
        onCloseRef.current();
        return;
      }

      if (event.key === 'Tab') {
        const overlayEl = overlayRef.current;
        if (!overlayEl) return;
        const focusables = getFocusableElements(overlayEl);
        if (focusables.length === 0) {
          event.preventDefault();
          overlayEl.focus({ preventScroll: true });
          return;
        }
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        const current = document.activeElement;

        if (event.shiftKey) {
          if (current === first || current === overlayEl || !overlayEl.contains(current)) {
            event.preventDefault();
            last.focus({ preventScroll: true });
          }
        } else if (current === last || !overlayEl.contains(current)) {
          event.preventDefault();
          first.focus({ preventScroll: true });
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown, true);

    return () => {
      window.cancelAnimationFrame(rafFocus);
      document.removeEventListener('keydown', handleKeyDown, true);

      const idx = activeModalStack.lastIndexOf(modalId);
      if (idx !== -1) {
        activeModalStack.splice(idx, 1);
      }

      if (activeModalStack.length === 0 && savedScrollState) {
        document.body.style.overflow = savedScrollState.bodyOverflow;
        document.body.style.paddingRight = savedScrollState.bodyPaddingRight;
        document.documentElement.style.overflow = savedScrollState.htmlOverflow;
        savedScrollState = null;
      }

      const prevEl = previousActiveRef.current;
      window.requestAnimationFrame(() => {
        if (activeModalStack.length === 0 && prevEl && prevEl.isConnected) {
          prevEl.focus({ preventScroll: true });
        }
      });
    };
  }, [isOpen, modalId, lockScroll, closeOnEscape, initialFocusRef]);

  if (!isOpen || typeof document === 'undefined') return null;

  const zClass = LEVEL_Z_INDEX[level] || LEVEL_Z_INDEX.base;

  return createPortal(
    <div
      ref={overlayRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby={labelledBy}
      aria-describedby={describedBy}
      aria-label={!labelledBy ? ariaLabel || 'Dialog' : undefined}
      tabIndex={-1}
      data-modal-portal="true"
      data-modal-level={level}
      onMouseDown={(e) => {
        if (closeOnBackdropClick && e.target === e.currentTarget && onCloseRef.current) {
          onCloseRef.current();
        }
      }}
      className={`fixed inset-0 ${zClass} flex items-center justify-center overflow-y-auto overscroll-contain outline-none ${overlayClassName}`}
    >
      {children}
    </div>,
    document.body
  );
}
