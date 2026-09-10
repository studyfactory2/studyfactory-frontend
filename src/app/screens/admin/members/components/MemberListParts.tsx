import type { ReactNode } from 'react';
import type { MemberRole } from '../../../../core/session';
import { cx } from '../../../../shared/lib/cx';
import {
  Badge,
  SectionEmpty,
  SectionError,
  SectionLoading,
} from '../../../../shared/ui';
import {
  describeCertification,
  hasSeat,
  ROLE_LABELS,
  type CertificationLookup,
} from '../model/admin-members';

const ROLE_TONES: Record<MemberRole, 'accent' | 'neutral' | 'special'> = {
  ADMIN: 'special',
  MEMBER: 'neutral',
  STAFF: 'accent',
};

export function SeatCell({ seatNumber }: { seatNumber: number | null }) {
  return (
    <span className="admin-member-list__seat">
      <span className="admin-members__sr-only">좌석</span>
      {hasSeat(seatNumber) ? (
        <b>{seatNumber}</b>
      ) : (
        <em className="admin-member-list__muted">미배정</em>
      )}
    </span>
  );
}

export function NameCell({ name }: { name: string }) {
  return <span className="admin-member-list__name">{name}</span>;
}

export function RoleCell({ role }: { role: MemberRole }) {
  return (
    <span className="admin-member-list__role">
      <span className="admin-members__sr-only">역할</span>
      <Badge tone={ROLE_TONES[role]}>{ROLE_LABELS[role]}</Badge>
    </span>
  );
}

/**
 * A secondary column. The label is read by screen readers in every layout
 * and shown to sighted people only once the row is stacked on a phone, where
 * the column header row is gone.
 */
export function LabelledCell({
  children,
  className,
  label,
}: {
  children: ReactNode;
  className?: string;
  label: string;
}) {
  return (
    <span className={cx('admin-member-list__cell', className)}>
      <span className="admin-member-list__label">{label}</span>
      <span className="admin-member-list__value">{children}</span>
    </span>
  );
}

export function CertificationValue({
  certificationId,
  lookup,
}: {
  certificationId: number | null;
  lookup: CertificationLookup;
}) {
  const certification = describeCertification(certificationId, lookup);

  if (certification === null) {
    return <em className="admin-member-list__muted">없음</em>;
  }

  return certification.resolved ? (
    <>{certification.text}</>
  ) : (
    <span className="admin-member-list__unresolved">{certification.text}</span>
  );
}

type ListStateProps = {
  children: ReactNode;
  emptyDescription: string;
  emptyTitle: string;
  errorMessage: string | null;
  filterActive: boolean;
  loading: boolean;
  loadingLabel: string;
  noResultTitle: string;
  onClearFilter: () => void;
  onRetry: () => void;
  /** Rows after search and role filter; null until the data is in. */
  rows: readonly unknown[] | null;
  /** Complete count before any filter; null until the data is in. */
  total: number | null;
};

/** Loading, error, empty and no-result states shared by both lists. */
export function ListState({
  children,
  emptyDescription,
  emptyTitle,
  errorMessage,
  filterActive,
  loading,
  loadingLabel,
  noResultTitle,
  onClearFilter,
  onRetry,
  rows,
  total,
}: ListStateProps) {
  if (loading) {
    return <SectionLoading label={loadingLabel} />;
  }

  if (errorMessage !== null) {
    return <SectionError message={errorMessage} onRetry={onRetry} />;
  }

  if (rows === null || total === null) {
    return null;
  }

  if (total === 0) {
    return (
      <SectionEmpty title={emptyTitle}>
        <p>{emptyDescription}</p>
      </SectionEmpty>
    );
  }

  if (rows.length === 0) {
    return (
      <SectionEmpty title={noResultTitle}>
        <p>검색어나 역할 조건을 바꿔 보세요.</p>
        {filterActive && (
          <button
            className="admin-members__clear"
            onClick={onClearFilter}
            type="button"
          >
            조건 지우기
          </button>
        )}
      </SectionEmpty>
    );
  }

  return <>{children}</>;
}
