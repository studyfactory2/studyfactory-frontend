import { ChevronRight } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { memberRoutes } from '../../../../core/router/routes';
import type { SessionOwnerKey } from '../../../../core/session';
import { MemberTaskDayCard } from '../../../../features/member-tasks/MemberTaskDayCard';

type Props = { memberId: number; ownerKey: SessionOwnerKey; today: string };

export function HomeDailyTasks(props: Props) {
  const [recoveryDate, setRecoveryDate] = useState<string | null>(null);
  const date = recoveryDate ?? props.today;

  return (
    <MemberTaskDayCard
      {...props}
      date={date}
      detailsLink={
        <Link
          aria-label="할 일 달력 자세히 보기"
          className="home-tasks__details"
          to={`${memberRoutes.tasks}?${new URLSearchParams({ date })}`}
        >
          자세히 <ChevronRight aria-hidden="true" size={13} />
        </Link>
      }
      key={`${props.ownerKey}:${date}`}
      onDateChange={(next) =>
        setRecoveryDate(next === props.today ? null : next)
      }
    />
  );
}
