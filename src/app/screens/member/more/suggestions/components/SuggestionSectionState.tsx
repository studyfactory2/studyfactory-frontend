import type { ReactNode } from 'react';
import { RotateCcw } from 'lucide-react';
import { Spinner } from '../../../../../shared/ui';
import '../styles/SuggestionSectionState.css';

export function SuggestionSectionLoading({ label }: { label: string }) {
  return (
    <div className="member-suggestions__state" role="status">
      <Spinner size="sm" />
      <span>{label}</span>
    </div>
  );
}

export function SuggestionSectionError({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="member-suggestions__state is-error" role="alert">
      <RotateCcw aria-hidden="true" size={16} />
      <span>{message}</span>
      <button onClick={onRetry} type="button">
        다시 시도
      </button>
    </div>
  );
}

export function SuggestionSectionEmpty({
  children,
  title,
}: {
  children?: ReactNode;
  title: string;
}) {
  return (
    <div className="member-suggestions__state is-empty">
      <strong>{title}</strong>
      {children}
    </div>
  );
}
