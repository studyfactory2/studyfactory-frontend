import type { ReactNode } from 'react';
import { RotateCcw } from 'lucide-react';
import { Spinner } from '../Spinner/Spinner';
import './section-state.css';

/**
 * The loading / error / empty trio a data section shows instead of its content.
 *
 * The member home screen keeps its own variant: its cards are narrower and use
 * a more compact, left-aligned treatment, so folding it in here would change
 * how the home screen looks.
 */
export function SectionLoading({ label }: { label: string }) {
  return (
    <div className="ui-section-state" role="status">
      <Spinner size="sm" />
      <span>{label}</span>
    </div>
  );
}

export function SectionError({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="ui-section-state is-error" role="alert">
      <RotateCcw aria-hidden="true" size={16} />
      <span>{message}</span>
      <button onClick={onRetry} type="button">
        다시 시도
      </button>
    </div>
  );
}

export function SectionEmpty({
  children,
  title,
}: {
  children?: ReactNode;
  title: string;
}) {
  return (
    <div className="ui-section-state is-empty">
      <strong>{title}</strong>
      {children}
    </div>
  );
}
