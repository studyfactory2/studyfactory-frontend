import { BarChart3, CalendarDays, ChevronRight, Ellipsis } from 'lucide-react';
import { Link } from 'react-router-dom';
import { memberRoutes } from '../../../../core/router/routes';
import '../styles/HomeQuickNav.css';

const QUICK_LINKS = [
  {
    description: '주간 계획 편집',
    icon: CalendarDays,
    label: '계획',
    to: memberRoutes.plans,
  },
  {
    description: '학습 기록 보기',
    icon: BarChart3,
    label: '학습',
    to: memberRoutes.study,
  },
  {
    description: '휴무·내 정보',
    icon: Ellipsis,
    label: '더보기',
    to: memberRoutes.more,
  },
] as const;

export function HomeQuickNav() {
  return (
    <nav aria-label="바로가기" className="member-home__quick-nav">
      {QUICK_LINKS.map((link) => {
        const Icon = link.icon;

        return (
          <Link className="member-home__quick-link" key={link.to} to={link.to}>
            <span className="member-home__quick-icon">
              <Icon aria-hidden="true" size={18} />
            </span>
            <span className="member-home__quick-copy">
              <strong>{link.label}</strong>
              <small>{link.description}</small>
            </span>
            <ChevronRight aria-hidden="true" size={16} />
          </Link>
        );
      })}
    </nav>
  );
}
