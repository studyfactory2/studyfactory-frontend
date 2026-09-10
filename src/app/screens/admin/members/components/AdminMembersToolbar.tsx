import { RefreshCw, Search } from 'lucide-react';
import { cx } from '../../../../shared/lib/cx';
import { Input, Select } from '../../../../shared/ui';
import {
  ROLE_FILTERS,
  type AdminMemberFilter,
  type AdminMemberRoleFilter,
  type AdminMembersView,
} from '../model/admin-members';

type AdminMembersToolbarProps = {
  counts: { current: number | null; pending: number | null };
  filter: AdminMemberFilter;
  onQueryChange: (query: string) => void;
  onRefresh: () => void;
  onRoleChange: (role: AdminMemberRoleFilter) => void;
  onViewChange: (view: AdminMembersView) => void;
  refreshing: boolean;
  view: AdminMembersView;
};

const VIEWS: readonly { label: string; value: AdminMembersView }[] = [
  { label: '현재 사원', value: 'current' },
  { label: '등록 대기', value: 'pending' },
];

function isRoleFilter(value: string): value is AdminMemberRoleFilter {
  return ROLE_FILTERS.some((option) => option.value === value);
}

/**
 * One row of controls. The counts on the switch are the complete totals for
 * the branch, whatever the search and role filter currently hide, so the two
 * numbers stay a fact about the branch rather than about the filter.
 */
export function AdminMembersToolbar({
  counts,
  filter,
  onQueryChange,
  onRefresh,
  onRoleChange,
  onViewChange,
  refreshing,
  view,
}: AdminMembersToolbarProps) {
  return (
    <div className="admin-members__toolbar">
      <div
        aria-label="목록 선택"
        className="admin-members__switch"
        role="group"
      >
        {VIEWS.map((option) => {
          const count =
            option.value === 'current' ? counts.current : counts.pending;

          return (
            <button
              aria-pressed={view === option.value}
              className={cx(
                'admin-members__switch-button',
                view === option.value && 'is-active',
              )}
              key={option.value}
              onClick={() => onViewChange(option.value)}
              type="button"
            >
              {option.label}
              <span className="admin-members__switch-count">
                {count ?? '–'}
              </span>
            </button>
          );
        })}
      </div>

      <div className="admin-members__tools">
        <label className="admin-members__search">
          <Search aria-hidden="true" size={15} />
          <span className="admin-members__sr-only">이름 또는 좌석 번호</span>
          <Input
            autoComplete="off"
            className="admin-members__search-input"
            enterKeyHint="search"
            inputMode="search"
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="이름 · 좌석 번호"
            type="search"
            value={filter.query}
          />
        </label>
        <label className="admin-members__role">
          <span className="admin-members__sr-only">역할</span>
          <Select
            className="admin-members__role-select"
            onChange={(event) => {
              if (isRoleFilter(event.target.value)) {
                onRoleChange(event.target.value);
              }
            }}
            value={filter.role}
          >
            {ROLE_FILTERS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </label>
        <button
          aria-label="새로고침"
          className={cx(
            'admin-members__refresh',
            refreshing && 'is-refreshing',
          )}
          disabled={refreshing}
          onClick={onRefresh}
          type="button"
        >
          <RefreshCw aria-hidden="true" size={16} />
        </button>
      </div>
    </div>
  );
}
