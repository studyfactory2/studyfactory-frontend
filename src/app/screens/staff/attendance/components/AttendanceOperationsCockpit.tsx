import {
  ChevronDown,
  CircleAlert,
  Inbox,
  ListChecks,
  LoaderCircle,
  MessageCircle,
  Utensils,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { cx } from '../../../../shared/lib/cx';

export type AttendanceCockpitSectionId =
  'tasks' | 'member-requests' | 'side-dish-orders';

export type AttendanceCockpitTone =
  'neutral' | 'urgent' | 'positive' | 'special';

export type AttendanceCockpitAction = {
  ariaLabel?: string;
  disabled?: boolean;
  label: string;
  loading?: boolean;
  onClick: () => void;
  pressed?: boolean;
  tone?: 'primary' | 'quiet' | 'positive';
};

export type AttendanceCockpitPreview = {
  action?: AttendanceCockpitAction;
  badge?: string;
  description?: string;
  id: number | string;
  meta?: string;
  title: string;
  tone?: AttendanceCockpitTone;
};

export type AttendanceCockpitSectionData = {
  actions?: readonly AttendanceCockpitAction[];
  count: number | null;
  countLabel: string;
  emptyMessage: string;
  errorMessage?: null | string;
  loading?: boolean;
  previews: readonly AttendanceCockpitPreview[];
  summary?: string;
};

export type AttendanceOperationsCockpitProps = {
  activeSection: AttendanceCockpitSectionId | null;
  className?: string;
  memberRequests: AttendanceCockpitSectionData;
  memberSideDishOrders: AttendanceCockpitSectionData;
  onRetry?: (section: AttendanceCockpitSectionId) => void;
  onSectionChange: (section: AttendanceCockpitSectionId | null) => void;
  todayTasks: AttendanceCockpitSectionData;
};

type CockpitSectionDefinition = {
  data: AttendanceCockpitSectionData;
  icon: LucideIcon;
  id: AttendanceCockpitSectionId;
  label: string;
};

export function AttendanceOperationsCockpit({
  activeSection,
  className,
  memberRequests,
  memberSideDishOrders,
  onRetry,
  onSectionChange,
  todayTasks,
}: AttendanceOperationsCockpitProps) {
  const sections: readonly CockpitSectionDefinition[] = [
    {
      data: todayTasks,
      icon: ListChecks,
      id: 'tasks',
      label: '오늘 업무',
    },
    {
      data: memberRequests,
      icon: MessageCircle,
      id: 'member-requests',
      label: '회원 요청',
    },
    {
      data: memberSideDishOrders,
      icon: Utensils,
      id: 'side-dish-orders',
      label: '회원 반찬 신청',
    },
  ];
  const selected = sections.find((section) => section.id === activeSection);

  return (
    <section
      aria-label="출석 운영 현황"
      className={cx('staff-attendance-cockpit', className)}
    >
      <div
        aria-label="수시 확인 항목"
        className="staff-attendance-cockpit__overview"
        role="group"
      >
        {sections.map((section) => {
          const Icon = section.icon;
          const active = section.id === activeSection;
          const summaryStatus = section.data.loading
            ? '확인 중'
            : section.data.errorMessage
              ? '확인 필요'
              : (section.data.summary ?? '새 항목 없음');
          const countStatus =
            section.data.count === null
              ? '수량 확인 중'
              : `${section.data.count.toLocaleString('ko-KR')}${section.data.countLabel}`;

          return (
            <button
              aria-controls={
                active ? `attendance-cockpit-panel-${section.id}` : undefined
              }
              aria-expanded={active}
              aria-label={`${section.label}, ${summaryStatus}, ${countStatus}`}
              className={cx(
                'staff-attendance-cockpit__summary',
                `is-${section.id}`,
                active && 'is-active',
                section.data.errorMessage && 'has-error',
              )}
              id={`attendance-cockpit-trigger-${section.id}`}
              key={section.id}
              onClick={() => onSectionChange(active ? null : section.id)}
              type="button"
            >
              <span
                aria-hidden="true"
                className="staff-attendance-cockpit__summary-icon"
              >
                <Icon size={18} strokeWidth={1.9} />
              </span>

              <span className="staff-attendance-cockpit__summary-copy">
                <strong>{section.label}</strong>
                <small>{summaryStatus}</small>
              </span>

              <span className="staff-attendance-cockpit__summary-count">
                <b>
                  {section.data.count === null
                    ? '—'
                    : section.data.count.toLocaleString('ko-KR')}
                </b>
                {section.data.count !== null && (
                  <small>{section.data.countLabel}</small>
                )}
              </span>

              <ChevronDown
                aria-hidden="true"
                className="staff-attendance-cockpit__summary-chevron"
                size={17}
              />
            </button>
          );
        })}
      </div>

      {selected && (
        <CockpitPanel
          labelledBy={`attendance-cockpit-trigger-${selected.id}`}
          onRetry={onRetry ? () => onRetry(selected.id) : undefined}
          section={selected}
        />
      )}
    </section>
  );
}

function CockpitPanel({
  labelledBy,
  onRetry,
  section,
}: {
  labelledBy: string;
  onRetry?: () => void;
  section: CockpitSectionDefinition;
}) {
  const { data } = section;

  return (
    <div
      aria-labelledby={labelledBy}
      className="staff-attendance-cockpit__panel"
      id={`attendance-cockpit-panel-${section.id}`}
      role="region"
    >
      <header className="staff-attendance-cockpit__panel-header">
        <span>
          <strong>{section.label}</strong>
          <small>
            {data.summary ??
              (data.count === null
                ? '확인 중'
                : `${data.count}${data.countLabel}`)}
          </small>
        </span>

        {data.actions && data.actions.length > 0 && (
          <div className="staff-attendance-cockpit__panel-actions">
            {data.actions.map((action) => (
              <CockpitAction
                action={action}
                key={`${section.id}-${action.label}`}
              />
            ))}
          </div>
        )}
      </header>

      <div
        aria-busy={data.loading}
        className="staff-attendance-cockpit__panel-body"
      >
        {data.errorMessage && (
          <div
            className="staff-attendance-cockpit__state is-error"
            role="alert"
          >
            <CircleAlert aria-hidden="true" size={19} />
            <span>{data.errorMessage}</span>
            {onRetry && (
              <button onClick={onRetry} type="button">
                다시 시도
              </button>
            )}
          </div>
        )}

        {!data.errorMessage && data.loading ? (
          <div className="staff-attendance-cockpit__state" role="status">
            <LoaderCircle
              aria-hidden="true"
              className="is-spinning"
              size={19}
            />
            <span>{section.label}을 불러오는 중이에요.</span>
          </div>
        ) : !data.errorMessage && data.previews.length === 0 ? (
          <div className="staff-attendance-cockpit__state">
            <Inbox aria-hidden="true" size={19} />
            <span>{data.emptyMessage}</span>
          </div>
        ) : data.previews.length > 0 ? (
          <ul className="staff-attendance-cockpit__preview-list">
            {data.previews.map((preview) => (
              <li
                className={cx(
                  'staff-attendance-cockpit__preview',
                  `is-${preview.tone ?? 'neutral'}`,
                )}
                key={preview.id}
              >
                <span className="staff-attendance-cockpit__preview-copy">
                  <span>
                    <strong>{preview.title}</strong>
                    {preview.badge && <em>{preview.badge}</em>}
                  </span>
                  {preview.description && <p>{preview.description}</p>}
                  {preview.meta && <small>{preview.meta}</small>}
                </span>

                {preview.action && (
                  <CockpitAction action={preview.action} compact />
                )}
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </div>
  );
}

function CockpitAction({
  action,
  compact = false,
}: {
  action: AttendanceCockpitAction;
  compact?: boolean;
}) {
  return (
    <button
      aria-busy={action.loading}
      aria-label={action.ariaLabel}
      aria-pressed={action.pressed}
      className={cx(
        'staff-attendance-cockpit__action',
        `is-${action.tone ?? 'quiet'}`,
        compact && 'is-compact',
      )}
      disabled={action.disabled || action.loading}
      onClick={action.onClick}
      type="button"
    >
      {action.loading && (
        <LoaderCircle aria-hidden="true" className="is-spinning" size={14} />
      )}
      {action.label}
    </button>
  );
}
