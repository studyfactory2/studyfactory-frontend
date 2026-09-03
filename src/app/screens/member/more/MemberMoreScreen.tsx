import {
  CalendarDays,
  ChevronRight,
  MessageSquareText,
  UserRound,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { memberRoutes } from '../../../core/router/routes';
import { Badge } from '../../../shared/ui';
import './styles/MemberMoreScreen.css';

type MoreMenuEntry = {
  description: string;
  icon: typeof CalendarDays;
  label: string;
  to: string | null;
};

const MORE_MENU_ENTRIES: MoreMenuEntry[] = [
  {
    description: '휴무를 달력에서 신청하고, 신청한 휴무를 취소해요.',
    icon: CalendarDays,
    label: '휴무',
    to: memberRoutes.moreLeaves,
  },
  {
    description: '비품·학습·상담 요청을 보내고 처리 상태를 확인해요.',
    icon: MessageSquareText,
    label: '요청',
    to: null,
  },
  {
    description: '이름, 좌석, 소속 지점과 준비 중인 자격증을 확인해요.',
    icon: UserRound,
    label: '내 정보',
    to: null,
  },
];

export function MemberMoreScreen() {
  return (
    <section className="member-more">
      <header className="member-more__header">
        <p className="member-more__eyebrow">MEMBER · MORE</p>
        <h2 className="member-more__title">더보기</h2>
        <p className="member-more__subtitle">
          휴무 신청, 요청 내역과 내 정보를 관리해요.
        </p>
      </header>

      <ul className="member-more__menu">
        {MORE_MENU_ENTRIES.map((entry) => (
          <li key={entry.label}>
            <MoreMenuRow entry={entry} />
          </li>
        ))}
      </ul>
    </section>
  );
}

function MoreMenuRow({ entry }: { entry: MoreMenuEntry }) {
  const Icon = entry.icon;
  const body = (
    <>
      <span aria-hidden="true" className="member-more__menu-icon">
        <Icon size={19} />
      </span>

      <span className="member-more__menu-copy">
        <strong>
          {entry.label}
          {entry.to === null && <Badge tone="neutral">준비 중</Badge>}
        </strong>
        <small>{entry.description}</small>
      </span>

      {entry.to !== null && (
        <ChevronRight
          aria-hidden="true"
          className="member-more__menu-arrow"
          size={18}
        />
      )}
    </>
  );

  if (entry.to === null) {
    return (
      <div aria-disabled="true" className="member-more__menu-row is-pending">
        {body}
      </div>
    );
  }

  return (
    <Link className="member-more__menu-row" to={entry.to}>
      {body}
    </Link>
  );
}
