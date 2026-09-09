import type { LucideIcon } from 'lucide-react';
import {
  Armchair,
  CalendarClock,
  CalendarDays,
  ListChecks,
  Utensils,
} from 'lucide-react';
import { cx } from '../../../../shared/lib/cx';

export type OperationsView = 'leave' | 'meals' | 'schedule' | 'seats' | 'work';

const TABS: readonly {
  description: string;
  icon: LucideIcon;
  label: string;
  value: OperationsView;
}[] = [
  {
    description: '할 일 · 회원 요청',
    icon: ListChecks,
    label: '오늘 업무',
    value: 'work',
  },
  {
    description: '내 휴무 신청',
    icon: CalendarDays,
    label: '내 휴무',
    value: 'leave',
  },
  {
    description: '점심 · 저녁',
    icon: Utensils,
    label: '내 반찬',
    value: 'meals',
  },
  {
    description: '주간 근무 배치',
    icon: CalendarClock,
    label: '근무표',
    value: 'schedule',
  },
  {
    description: '배정 · 이동 · 해제',
    icon: Armchair,
    label: '좌석 관리',
    value: 'seats',
  },
];

export function OperationsTabs({
  active,
  onChange,
}: {
  active: OperationsView;
  onChange: (view: OperationsView) => void;
}) {
  return (
    <nav aria-label="운영 메뉴" className="staff-operations__tabs">
      {TABS.map(({ description, icon: Icon, label, value }) => (
        <button
          aria-pressed={active === value}
          className={cx(
            'staff-operations__tab',
            active === value && 'is-active',
          )}
          key={value}
          onClick={() => onChange(value)}
          type="button"
        >
          <Icon aria-hidden="true" size={18} />
          <span>
            <strong>{label}</strong>
            <small>{description}</small>
          </span>
        </button>
      ))}
    </nav>
  );
}
