import { useQuery } from '@tanstack/react-query';
import {
  CalendarCheck,
  CalendarDays,
  ChevronRight,
  Coffee,
  LogOut,
  QrCode,
  UsersRound,
  Utensils,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { appRoutes } from '../../core/router/routes';
import { clearSession, useSession } from '../../core/session';
import { fetchBranches } from '../../features/branches/branches-api';
import { branchQueryKeys } from '../../features/branches/branch-query-keys';
import {
  getManagerMobileNavigation,
  type ManagerMenuGroup,
  type ManagerMenuItem,
} from '../../shared/layout/AppShell/manager-mobile-navigation';
import './manager-hub.css';

const icons = {
  members: UsersRound,
  leave: CalendarDays,
  qr: QrCode,
  beverage: Coffee,
  'own-leave': CalendarCheck,
  meals: Utensils,
};

/** A navigation page only: all rows open the existing guarded screens. */
export function ManagerHubScreen({ group }: { group: ManagerMenuGroup }) {
  const session = useSession();
  const navigate = useNavigate();
  const branches = useQuery({
    queryFn: fetchBranches,
    queryKey: branchQueryKeys.all(),
    staleTime: 5 * 60 * 1000,
  });
  const navigation = getManagerMobileNavigation(session.role);
  if (!navigation || (group === 'admin' && session.role !== 'ADMIN'))
    return null;
  const items: ManagerMenuItem[] = navigation[group];
  // ADMIN can reach legacy tools from either hub without crossing role guards.
  const secondary: ManagerMenuItem[] = (
    session.role === 'ADMIN' ? navigation.admin : items
  ).filter((item) => 'secondary' in item && item.secondary);
  const branchName =
    branches.data?.find((branch) => branch.id === session.branchId)?.name ??
    (branches.isPending ? '확인 중' : '확인 불가');
  const memberName = session.memberName ?? '회원';

  return (
    <section
      aria-label={group === 'admin' ? '관리자 페이지' : '스태프 페이지'}
      className="manager-workspace-hub"
    >
      <p className="manager-workspace-hub__caption">
        {group === 'admin' ? '지점 관리' : '운영과 나의 신청'}
      </p>
      <nav
        aria-label={group === 'admin' ? '관리자 기능' : '스태프 기능'}
        className="manager-workspace-hub__destinations"
      >
        {items
          .filter((item) => !item.secondary)
          .map((item) => {
            const Icon = icons[item.icon!];
            return (
              <Link key={item.to} to={item.to}>
                <span
                  aria-hidden="true"
                  className="manager-workspace-hub__icon"
                >
                  <Icon size={20} strokeWidth={1.7} />
                </span>
                <span className="manager-workspace-hub__copy">
                  <strong>{item.label}</strong>
                  <small>{item.description}</small>
                </span>
                <ChevronRight aria-hidden="true" size={17} />
              </Link>
            );
          })}
      </nav>
      <nav
        aria-label="기존 페이지"
        className="manager-workspace-hub__secondary"
      >
        {secondary.map((item) => (
          <Link key={item.to} to={item.to}>
            <span>{item.label}</span>
            <ChevronRight aria-hidden="true" size={16} />
          </Link>
        ))}
      </nav>
      <footer className="manager-workspace-hub__account">
        <span aria-hidden="true" className="manager-workspace-hub__avatar">
          {memberName.slice(0, 1)}
        </span>
        <p>
          <strong>
            {memberName} · {session.role === 'ADMIN' ? '관리자' : '스태프'}
          </strong>
          <small>소속 지점 · {branchName}</small>
        </p>
        <button
          aria-label="로그아웃"
          onClick={() => {
            clearSession();
            void navigate(appRoutes.login, { replace: true });
          }}
          type="button"
        >
          <LogOut aria-hidden="true" size={18} />
          <span>로그아웃</span>
        </button>
      </footer>
    </section>
  );
}
