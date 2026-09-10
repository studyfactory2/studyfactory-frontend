import { useId } from 'react';
import { Building2, ChevronDown, RotateCcw } from 'lucide-react';
import type { BranchResponse } from '../../../features/branches/branches-api';
import { cx } from '../../../shared/lib/cx';
import { Spinner } from '../../../shared/ui';

type AdminBranchSelectorProps = {
  /**
   * Whether the error block is a live region. False while the workspace's
   * content area is already announcing the same failure, so a screen reader
   * hears it once; the visible message and retry button stay either way.
   */
  announceError: boolean;
  branches: BranchResponse[];
  errorMessage: string | null;
  loading: boolean;
  onRetry: () => void;
  onSelect: (branchId: number) => void;
  /** Null while nothing concrete is chosen; the control then shows a prompt. */
  selectedBranchId: number | null;
};

/**
 * The Admin's operating-branch switch. A native select on purpose: it is
 * keyboard- and screen-reader-complete for free, opens the platform picker on
 * a phone, and needs no positioning code in a sticky header. Only the shell
 * around it is styled.
 */
export function AdminBranchSelector({
  announceError,
  branches,
  errorMessage,
  loading,
  onRetry,
  onSelect,
  selectedBranchId,
}: AdminBranchSelectorProps) {
  const id = useId();

  if (errorMessage !== null) {
    return (
      <div
        className="admin-branch-selector is-error"
        role={announceError ? 'alert' : undefined}
      >
        <span className="admin-branch-selector__label">운영 지점</span>
        <span className="admin-branch-selector__message">{errorMessage}</span>
        <button
          className="admin-branch-selector__retry"
          onClick={onRetry}
          type="button"
        >
          <RotateCcw aria-hidden="true" size={13} />
          다시 시도
        </button>
      </div>
    );
  }

  const resolved =
    selectedBranchId !== null &&
    branches.some((branch) => branch.id === selectedBranchId);

  return (
    <div
      className={cx(
        'admin-branch-selector',
        loading && 'is-loading',
        !loading && !resolved && 'is-unresolved',
      )}
    >
      <label className="admin-branch-selector__label" htmlFor={id}>
        운영 지점
      </label>
      <span className="admin-branch-selector__control">
        {loading ? (
          <Spinner className="admin-branch-selector__icon" size="sm" />
        ) : (
          <Building2
            aria-hidden="true"
            className="admin-branch-selector__icon"
            size={15}
          />
        )}
        <select
          className="admin-branch-selector__select"
          disabled={loading || branches.length === 0}
          id={id}
          onChange={(event) => {
            const next = Number(event.target.value);

            if (Number.isInteger(next)) {
              onSelect(next);
            }
          }}
          value={resolved ? String(selectedBranchId) : ''}
        >
          {loading ? (
            <option value="">지점 불러오는 중</option>
          ) : (
            !resolved && (
              <option disabled value="">
                {branches.length === 0
                  ? '등록된 지점 없음'
                  : '지점을 선택하세요'}
              </option>
            )
          )}
          {branches.map((branch) => (
            <option key={branch.id} value={branch.id}>
              {branch.name}
            </option>
          ))}
        </select>
        <ChevronDown
          aria-hidden="true"
          className="admin-branch-selector__chevron"
          size={14}
        />
      </span>
    </div>
  );
}
