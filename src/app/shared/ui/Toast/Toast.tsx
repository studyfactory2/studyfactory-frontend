import type { ReactNode } from 'react';
import { useCallback, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle2, CircleAlert, Info } from 'lucide-react';
import { cx } from '../../lib/cx';
import type { ToastTone } from './toast-context';
import { ToastContext } from './toast-context';
import './toast.css';

type ToastItem = {
  id: number;
  message: string;
  tone: ToastTone;
};

const TOAST_DURATION_MS = 3500;

const toneIcons = {
  error: CircleAlert,
  info: Info,
  success: CheckCircle2,
} as const;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const nextId = useRef(1);

  const toast = useCallback((message: string, tone: ToastTone = 'info') => {
    const id = nextId.current++;
    setItems((current) => [...current, { id, message, tone }]);
    window.setTimeout(() => {
      setItems((current) => current.filter((item) => item.id !== id));
    }, TOAST_DURATION_MS);
  }, []);

  const value = useMemo(() => ({ toast }), [toast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {createPortal(
        <div aria-live="polite" className="toast-stack">
          {items.map((item) => {
            const Icon = toneIcons[item.tone];

            return (
              <div
                className={cx('toast', `toast--${item.tone}`)}
                key={item.id}
                role="status"
              >
                <Icon className="toast__icon" size={17} />
                <span className="toast__message">{item.message}</span>
              </div>
            );
          })}
        </div>,
        document.body,
      )}
    </ToastContext.Provider>
  );
}
