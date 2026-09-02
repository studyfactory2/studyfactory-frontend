import type { ReactNode } from 'react';
import { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cx } from '../../lib/cx';
import './modal.css';

type ModalProps = {
  children: ReactNode;
  footer?: ReactNode;
  onClose: () => void;
  open: boolean;
  size?: 'sm' | 'md';
  title: string;
};

export function Modal({
  children,
  footer,
  onClose,
  open,
  size = 'md',
  title,
}: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();

  useEffect(() => {
    if (!open) {
      return;
    }

    const previousFocus =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    const appRoot = document.getElementById('root');
    const previousAriaHidden = appRoot?.getAttribute('aria-hidden') ?? null;
    const previousInert = appRoot?.inert ?? false;
    const focusableElements = getFocusableElements(panelRef.current);

    (focusableElements[0] ?? panelRef.current)?.focus();

    if (appRoot) {
      appRoot.inert = true;
      appRoot.setAttribute('aria-hidden', 'true');
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
        return;
      }

      if (event.key !== 'Tab') {
        return;
      }

      const focusable = getFocusableElements(panelRef.current);

      if (focusable.length === 0) {
        event.preventDefault();
        panelRef.current?.focus();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);

      if (appRoot) {
        appRoot.inert = previousInert;

        if (previousAriaHidden === null) {
          appRoot.removeAttribute('aria-hidden');
        } else {
          appRoot.setAttribute('aria-hidden', previousAriaHidden);
        }
      }

      previousFocus?.focus();
    };
  }, [open, onClose]);

  if (!open) {
    return null;
  }

  return createPortal(
    <div
      className="modal"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
      role="presentation"
    >
      <div
        aria-labelledby={titleId}
        aria-modal="true"
        className={cx('modal__panel', `modal__panel--${size}`)}
        ref={panelRef}
        role="dialog"
        tabIndex={-1}
      >
        <header className="modal__header">
          <h3 className="modal__title" id={titleId}>
            {title}
          </h3>
          <button
            aria-label="닫기"
            className="modal__close"
            onClick={onClose}
            type="button"
          >
            <X aria-hidden="true" size={18} />
          </button>
        </header>
        <div className="modal__body">{children}</div>
        {footer && <footer className="modal__footer">{footer}</footer>}
      </div>
    </div>,
    document.body,
  );
}

function getFocusableElements(container: HTMLElement | null) {
  if (!container) {
    return [];
  }

  return Array.from(
    container.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
    ),
  ).filter((element) => element.tabIndex >= 0);
}
