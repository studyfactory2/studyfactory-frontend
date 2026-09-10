import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Search,
} from 'lucide-react';
import { formatKoreanDate } from '../../../../shared/lib/seoul-date';
import {
  Badge,
  Card,
  Input,
  SectionEmpty,
  SectionError,
  SectionLoading,
} from '../../../../shared/ui';
import { cx } from '../../../../shared/lib/cx';
import type { AdminDailyLeavesState } from '../hooks/useAdminDailyLeaves';
import {
  ADMIN_LEAVE_FILTERS,
  type AdminDailyLeaveMember,
  type AdminDailyLeaveRecord,
} from '../model/admin-daily-leaves';

type AdminDailyLeaveOverviewProps = {
  branchName: string;
  leaves: AdminDailyLeavesState;
};

export function AdminDailyLeaveOverview({
  branchName,
  leaves,
}: AdminDailyLeaveOverviewProps) {
  return (
    <Card className="admin-leaves" padding="none">
      <header className="admin-leaves__header">
        <div className="admin-leaves__heading">
          <span aria-hidden="true" className="admin-leaves__heading-icon">
            <CalendarDays size={19} />
          </span>
          <div>
            <h3>일별 휴무 현황</h3>
            <p>본인 신청과 지점 등록 휴무를 날짜별로 확인해요.</p>
          </div>
        </div>
        <button
          aria-busy={leaves.request.refreshing}
          aria-label="휴무 현황 새로고침"
          className={cx(
            'admin-leaves__refresh',
            leaves.request.refreshing && 'is-refreshing',
          )}
          disabled={leaves.request.refreshing}
          onClick={leaves.request.onRefresh}
          type="button"
        >
          <RefreshCw aria-hidden="true" size={16} />
          <span>새로고침</span>
        </button>
      </header>

      <div className="admin-leaves__date-row">
        <div className="admin-leaves__date-summary">
          <p>{leaves.date.isToday ? '오늘 휴무' : '선택 날짜'}</p>
          <strong>
            {branchName} · {formatKoreanDate(leaves.date.dateKey)}
          </strong>
        </div>
        <div className="admin-leaves__date-controls">
          <button
            aria-label="이전 날짜"
            className="admin-leaves__date-step"
            onClick={leaves.date.onPreviousDay}
            type="button"
          >
            <ChevronLeft aria-hidden="true" size={17} />
          </button>
          <label className="admin-leaves__date-field">
            <span className="admin-leaves__sr-only">조회 날짜</span>
            <input
              onChange={(event) => leaves.date.onDateChange(event.target.value)}
              type="date"
              value={leaves.date.dateKey}
            />
          </label>
          <button
            aria-label="다음 날짜"
            className="admin-leaves__date-step"
            onClick={leaves.date.onNextDay}
            type="button"
          >
            <ChevronRight aria-hidden="true" size={17} />
          </button>
          <button
            className="admin-leaves__today"
            disabled={leaves.date.isToday}
            onClick={leaves.date.onToday}
            type="button"
          >
            오늘
          </button>
        </div>
      </div>

      {!leaves.request.loading && leaves.request.errorMessage === null && (
        <>
          <dl className="admin-leaves__metrics">
            <Metric label="휴무 인원" unit="명" value={leaves.metrics.people} />
            <Metric
              label="본인 신청"
              unit="건"
              value={leaves.metrics.selfRequests}
            />
            <Metric
              label="지점 등록"
              unit="건"
              value={leaves.metrics.officeEntries}
            />
            <Metric
              label="당일 8시대"
              unit="건"
              value={leaves.metrics.lateRequests}
              warning={leaves.metrics.lateRequests > 0}
            />
          </dl>

          <div className="admin-leaves__toolbar">
            <label className="admin-leaves__search">
              <span className="admin-leaves__sr-only">이름 또는 좌석 검색</span>
              <Search aria-hidden="true" size={17} />
              <Input
                className="admin-leaves__search-input"
                onChange={(event) =>
                  leaves.filter.onSearchChange(event.target.value)
                }
                placeholder="이름 또는 좌석 검색"
                type="search"
                value={leaves.filter.searchQuery}
              />
            </label>

            <div
              aria-label="휴무 구분 필터"
              className="admin-leaves__filters"
              role="group"
            >
              {ADMIN_LEAVE_FILTERS.filter(
                (option) =>
                  option.value !== 'OTHER' || leaves.filter.counts.OTHER > 0,
              ).map((option) => (
                <button
                  aria-pressed={leaves.filter.value === option.value}
                  className={cx(
                    leaves.filter.value === option.value && 'is-active',
                  )}
                  key={option.value}
                  onClick={() => leaves.filter.onChange(option.value)}
                  type="button"
                >
                  <span>{option.label}</span>
                  <small>{leaves.filter.counts[option.value]}</small>
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      <div
        aria-busy={leaves.request.loading || leaves.request.refreshing}
        className="admin-leaves__body"
      >
        {leaves.request.loading ? (
          <SectionLoading label="휴무 현황을 불러오는 중이에요." />
        ) : leaves.request.errorMessage !== null ? (
          <SectionError
            message={leaves.request.errorMessage}
            onRetry={leaves.request.onRetry}
          />
        ) : leaves.list.totalRecordCount === 0 ? (
          <SectionEmpty title="등록된 휴무가 없어요">
            <p>{formatKoreanDate(leaves.date.dateKey)} 휴무 기록이 없어요.</p>
          </SectionEmpty>
        ) : leaves.list.members.length === 0 ? (
          <SectionEmpty title="조건에 맞는 휴무가 없어요">
            <p>검색어나 휴무 유형을 바꾸어 확인해 보세요.</p>
            <button
              className="admin-leaves__clear"
              onClick={leaves.filter.onClear}
              type="button"
            >
              조건 지우기
            </button>
          </SectionEmpty>
        ) : (
          <>
            <p className="admin-leaves__result" role="status">
              {leaves.list.members.length}명 · {leaves.list.recordCount}건
            </p>
            <ul aria-label="일별 휴무 명단" className="admin-leaves__list">
              {leaves.list.members.map((member) => (
                <LeaveMemberRow key={member.memberId} member={member} />
              ))}
            </ul>
          </>
        )}
      </div>
    </Card>
  );
}

function Metric({
  label,
  unit,
  value,
  warning = false,
}: {
  label: string;
  unit: string;
  value: number;
  warning?: boolean;
}) {
  return (
    <div className={cx(warning && 'is-warning')}>
      <dt>{label}</dt>
      <dd>
        {value}
        <small>{unit}</small>
      </dd>
    </div>
  );
}

function LeaveMemberRow({ member }: { member: AdminDailyLeaveMember }) {
  return (
    <li className="admin-leaves__member">
      <div className="admin-leaves__identity">
        <span
          aria-label={
            member.seatNumber === null
              ? '좌석 미배정'
              : `좌석 ${member.seatNumber}번`
          }
          className={cx(member.seatNumber === null && 'is-unassigned')}
        >
          {member.seatNumber ?? '미배정'}
        </span>
        <strong>{member.name}</strong>
      </div>
      <ul className="admin-leaves__records">
        {member.records.map((record) => (
          <LeaveRecord key={record.key} record={record} />
        ))}
      </ul>
    </li>
  );
}

function LeaveRecord({ record }: { record: AdminDailyLeaveRecord }) {
  const badgeTone =
    record.sourceTone === 'self'
      ? 'positive'
      : record.sourceTone === 'other'
        ? 'neutral'
        : 'special';

  return (
    <li className="admin-leaves__record">
      <Badge tone={badgeTone}>{record.label}</Badge>
      <span className="admin-leaves__source">{record.sourceLabel}</span>
      {record.requestedAfterEight && (
        <Badge className="admin-leaves__late" tone="danger">
          당일 08:00–09:00{' '}
          {record.sourceTone === 'self'
            ? '신청'
            : record.sourceTone === 'other'
              ? '기록'
              : '등록'}
        </Badge>
      )}
    </li>
  );
}
