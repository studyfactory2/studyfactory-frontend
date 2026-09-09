import type { LucideIcon } from 'lucide-react';
import { ArrowUpRight, ClipboardCheck, Coffee, Settings2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { staffRoutes } from '../../../../core/router/routes';
import { SectionError } from '../../../../shared/ui';
import { cx } from '../../../../shared/lib/cx';
import type { useStaffHome } from '../hooks/useStaffHome';

type StaffHomeJobsProps = {
  jobs: ReturnType<typeof useStaffHome>['jobs'];
};

export function StaffHomeJobs({ jobs }: StaffHomeJobsProps) {
  const operationsPendingCount =
    jobs.operations.remainingCount === null ||
    jobs.operations.openSuggestionCount === null
      ? null
      : jobs.operations.remainingCount + jobs.operations.openSuggestionCount;
  const operationsPanel =
    jobs.operations.remainingCount !== null &&
    jobs.operations.remainingCount > 0
      ? 'tasks'
      : jobs.operations.openSuggestionCount !== null &&
          jobs.operations.openSuggestionCount > 0
        ? 'member-requests'
        : null;
  const operationsTarget = operationsPanel
    ? `${staffRoutes.attendance}?panel=${operationsPanel}`
    : staffRoutes.attendance;

  return (
    <div className="staff-home__jobs-block">
      <div className="staff-home__jobs">
        <JobTile
          facts={[
            `${jobs.beverages.kindCount}가지`,
            jobs.beverages.noteCount > 0
              ? `요청 메모 ${jobs.beverages.noteCount}건`
              : null,
          ]}
          icon={Coffee}
          label="음료"
          tone="beverage"
          to={staffRoutes.beverages}
          unit="잔"
          value={jobs.beverages.cupCount}
        />
        <JobTile
          alert
          facts={[
            `착석 ${jobs.room.seatedCount}명`,
            jobs.room.unmarkedCount > 0
              ? `미확인 ${jobs.room.unmarkedCount}명`
              : null,
          ]}
          icon={ClipboardCheck}
          label="출석"
          tone="attendance"
          to={staffRoutes.attendance}
          unit="명 미착석"
          value={jobs.room.notSeatedCount}
        />
        <JobTile
          alert
          facts={[
            jobs.operations.remainingCount === null
              ? null
              : `오늘 업무 ${jobs.operations.remainingCount}건${
                  jobs.operations.urgentCount > 0
                    ? ` · 긴급 ${jobs.operations.urgentCount}건`
                    : ''
                }`,
            jobs.operations.openSuggestionCount === null
              ? null
              : `회원 요청 ${jobs.operations.openSuggestionCount}건`,
          ]}
          icon={Settings2}
          label="오늘 운영"
          tone="operations"
          to={operationsTarget}
          unit="건 확인"
          value={operationsPendingCount}
        />
      </div>

      {jobs.errorMessage && (
        <SectionError message={jobs.errorMessage} onRetry={jobs.onRetry} />
      )}
    </div>
  );
}

type JobTileProps = {
  /** Colours the figure as something needing attention rather than a total. */
  alert?: boolean;
  facts: Array<string | null>;
  icon: LucideIcon;
  label: string;
  tone: 'attendance' | 'beverage' | 'operations';
  to: string;
  unit: string;
  /** Null while the tile's own query is still answering. */
  value: number | null;
};

function JobTile({
  alert = false,
  facts,
  icon: Icon,
  label,
  tone,
  to,
  unit,
  value,
}: JobTileProps) {
  const shownFacts = facts.filter((fact): fact is string => Boolean(fact));

  return (
    <Link
      className={cx(
        'staff-home__job',
        `is-${tone}`,
        alert && value !== null && value > 0 && 'is-alert',
      )}
      to={to}
    >
      <span className="staff-home__job-top">
        <span className="staff-home__job-icon">
          <Icon aria-hidden="true" size={19} />
        </span>
        <span className="staff-home__job-label">{label}</span>
        <ArrowUpRight
          aria-hidden="true"
          className="staff-home__job-arrow"
          size={17}
        />
      </span>

      <span className="staff-home__job-figure">
        <b>{value === null ? '—' : value}</b>
        <span>{unit}</span>
      </span>

      {shownFacts.length > 0 && value !== null && (
        <span className="staff-home__job-facts">
          {shownFacts.map((fact) => (
            <span key={fact}>{fact}</span>
          ))}
        </span>
      )}
    </Link>
  );
}
