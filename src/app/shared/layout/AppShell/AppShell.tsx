import type { ReactNode } from 'react';
import { useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { LogOut } from 'lucide-react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { clearSession, useSession } from '../../../core/session';
import { appRoutes } from '../../../core/router/routes';
import { fetchBranches } from '../../../features/branches/branches-api';
import { branchQueryKeys } from '../../../features/branches/branch-query-keys';
import { cx } from '../../lib/cx';
import type { WorkspaceNavigationItem } from './types';

type AppShellProps = {
  children: ReactNode;
  navigation: WorkspaceNavigationItem[];
  workspaceLabel: string;
};

export function AppShell({
  children,
  navigation,
  workspaceLabel,
}: AppShellProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const mainRef = useRef<HTMLElement>(null);
  const session = useSession();
  const branchesQuery = useQuery({
    queryFn: fetchBranches,
    queryKey: branchQueryKeys.all(),
    staleTime: 5 * 60 * 1000,
  });
  const activeItem =
    [...navigation]
      .sort((left, right) => right.to.length - left.to.length)
      .find(
        (item) =>
          location.pathname === item.to ||
          (!item.end && location.pathname.startsWith(`${item.to}/`)),
      ) ?? navigation[0];
  const branchName =
    branchesQuery.data?.find((branch) => branch.id === session.branchId)
      ?.name ?? '소속 지점';
  const memberName = session.memberName ?? '회원';

  useEffect(() => {
    window.scrollTo({ left: 0, top: 0 });
    mainRef.current?.focus({ preventScroll: true });
  }, [location.pathname]);

  const handleLogout = () => {
    clearSession();
    navigate(appRoutes.login, { replace: true });
  };

  return (
    <div className="workspace-shell">
      <aside className="workspace-shell__sidebar">
        <NavLink
          aria-label="자격증공장 홈"
          className="workspace-shell__brand"
          to={navigation[0].to}
        >
          <span className="workspace-shell__brand-mark">
            <img alt="" src="/favicon.svg" />
          </span>
          <span className="workspace-shell__brand-copy">
            <strong>자격증공장</strong>
            <small>학습 운영 시스템</small>
          </span>
        </NavLink>

        <nav
          aria-label={`${workspaceLabel} 주요 메뉴`}
          className="workspace-shell__navigation"
        >
          {navigation.map((item) => (
            <WorkspaceNavigationLink item={item} key={item.to} />
          ))}
        </nav>

        <div className="workspace-shell__account">
          <span aria-hidden="true" className="workspace-shell__avatar">
            {memberName.slice(0, 1).toUpperCase()}
          </span>
          <span className="workspace-shell__account-copy">
            <strong>{memberName}</strong>
            <small>
              {branchName} · {workspaceLabel}
            </small>
          </span>
          <button
            aria-label="로그아웃"
            className="workspace-shell__logout"
            onClick={handleLogout}
            type="button"
          >
            <LogOut aria-hidden="true" size={18} />
          </button>
        </div>
      </aside>

      <main className="workspace-shell__main" ref={mainRef} tabIndex={-1}>
        <header className="workspace-shell__topbar">
          <div>
            <p>
              {branchName} <span>·</span> {workspaceLabel}
            </p>
            <h1>{activeItem.label}</h1>
          </div>
          <div className="workspace-shell__topbar-account">
            <span aria-hidden="true" className="workspace-shell__avatar">
              {memberName.slice(0, 1).toUpperCase()}
            </span>
            <span>
              <strong>{memberName}</strong>
              <small>{workspaceLabel}</small>
            </span>
            <button
              aria-label="로그아웃"
              className="workspace-shell__logout"
              onClick={handleLogout}
              type="button"
            >
              <LogOut aria-hidden="true" size={18} />
            </button>
          </div>
        </header>

        <div className="workspace-shell__content">{children}</div>
      </main>

      <nav
        aria-label={`${workspaceLabel} 모바일 메뉴`}
        className="workspace-shell__bottom-navigation"
      >
        {navigation.map((item) => (
          <WorkspaceNavigationLink compact item={item} key={item.to} />
        ))}
      </nav>
    </div>
  );
}

function WorkspaceNavigationLink({
  compact = false,
  item,
}: {
  compact?: boolean;
  item: WorkspaceNavigationItem;
}) {
  const Icon = item.icon;

  return (
    <NavLink
      aria-label={item.label}
      className={({ isActive }) =>
        cx(
          compact
            ? 'workspace-shell__bottom-link'
            : 'workspace-shell__navigation-link',
          isActive && 'is-active',
        )
      }
      end={item.end}
      to={item.to}
    >
      <Icon aria-hidden="true" size={compact ? 21 : 20} strokeWidth={2} />
      <span>{item.label}</span>
    </NavLink>
  );
}
