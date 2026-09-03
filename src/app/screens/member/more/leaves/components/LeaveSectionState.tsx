import type { ReactNode } from 'react';
import { RotateCcw } from 'lucide-react';
import { Spinner } from '../../../../../shared/ui';
import '../styles/LeaveSectionState.css';

export function LeaveSectionLoading({ label }: { label: string }) {
  return (
    <div className="member-leaves__section-state" role="status">
      <Spinner size="sm" />
      <span>{label}</span>
    </div>
  );
}

export function LeaveSectionError({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="member-leaves__section-state is-error" role="alert">
      <RotateCcw aria-hidden="true" size={16} />
      <span>{message}</span>
      <button onClick={onRetry} type="button">
        다시 시도
      </button>
    </div>
  );
}

export function LeaveSectionEmpty({
  children,
  title,
}: {
  children?: ReactNode;
  title: string;
}) {
  return (
    <div className="member-leaves__section-state is-empty">
      <strong>{title}</strong>
      {children}
    </div>
  );
}
