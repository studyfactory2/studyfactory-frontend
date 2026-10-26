import type { ReactNode } from 'react';
import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { LogOut } from 'lucide-react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { clearSession, useSession } from '../../../core/session';
import { appRoutes } from '../../../core/router/routes';
import { fetchBranches } from '../../../features/branches/branches-api';
import { branchQueryKeys } from '../../../features/branches/branch-query-keys';
import { cx } from '../../lib/cx';
import type { WorkspaceNavigationItem } from './types';
import { ManagerMobileNavigation } from './ManagerMobileNavigation';
import { ManagerMobilePageHeader } from './ManagerMobilePageHeader';
import {
  getManagerMobileNavigation,
  getManagerMobilePage,
  type ManagerWorkspaceRole,
} from './manager-mobile-navigation';
import {
  ScreenHeaderControlContext,
  ScreenToolbarContext,
} from './screen-toolbar-context';

type AppShellProps = {
  children: ReactNode;
  displayBranchName?: string;
  headerTools?: ReactNode;
  mobileWorkspaceRole?: ManagerWorkspaceRole;
  navigation: WorkspaceNavigationItem[];
  pageTitle?: string;
  screenToolbar?: boolean;
  workspaceLabel: string;
};

export function AppShell({
  children,
  displayBranchName,
  headerTools,
  mobileWorkspaceRole,
  navigation,
  pageTitle,
  screenToolbar = false,
  workspaceLabel,
}: AppShellProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const mainRef = useRef<HTMLElement>(null);
  const [toolbarTarget, setToolbarTarget] = useState<HTMLDivElement | null>(
    null,
  );
  const [headerControlTarget, setHeaderControlTarget] =
    useState<HTMLDivElement | null>(null);
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
  const topbarBranchName = displayBranchName ?? branchName;
  const memberName = session.memberName ?? '회원';
  const operationsSection = mobileWorkspaceRole
    ? new URLSearchParams(location.search).get('section')
    : null;
  const mobilePage = mobileWorkspaceRole
    ? getManagerMobilePage(
        mobileWorkspaceRole,
        location.pathname,
        location.search,
      )
    : null;
  const managerNavigation = mobileWorkspaceRole
    ? getManagerMobileNavigation(mobileWorkspaceRole)
    : null;
  const isHub =
    managerNavigation !== null &&
    (location.pathname === managerNavigation.adminHub ||
      location.pathname === managerNavigation.staffHub);

  useEffect(() => {
    window.scrollTo({ left: 0, top: 0 });
    mainRef.current?.focus({ preventScroll: true });
  }, [location.pathname, operationsSection]);

  const handleLogout = () => {
    clearSession();
    navigate(appRoutes.login, { replace: true });
  };

  return (
    <div
      className={cx(
        'workspace-shell',
        mobileWorkspaceRole && 'workspace-shell--manager',
        isHub && 'workspace-shell--manager-hub',
      )}
    >
      <aside className="workspace-shell__sidebar">
        <NavLink
          aria-label="자격증공장 홈"
          className="workspace-shell__brand"
          to={navigation[0].to}
        >
          <picture className="workspace-shell__brand-mark">
            <img alt="" src="/study-factory-logo.png" />
          </picture>
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
        <header
          className={cx(
            'workspace-shell__topbar',
            headerTools !== undefined && 'workspace-shell__topbar--with-tools',
            screenToolbar && 'workspace-shell__topbar--screen-toolbar',
          )}
        >
          {mobileWorkspaceRole && (
            <div className="workspace-shell__mobile-navigation">
              <ManagerMobileNavigation
                branchName={topbarBranchName}
                role={mobileWorkspaceRole}
              />
            </div>
          )}
          {mobilePage && !screenToolbar && (
            <ManagerMobilePageHeader
              accountBranchName={branchName}
              branchName={topbarBranchName}
              branchSelector={headerTools}
              page={mobilePage}
            />
          )}
          <div className="workspace-shell__topbar-title">
            <img
              alt=""
              className="workspace-shell__topbar-mark"
              src="/study-factory-logo.png"
            />
            <div>
              <p>
                {topbarBranchName} <span>·</span> {workspaceLabel}
              </p>
              <h1>
                {isHub ? mobilePage?.title : (pageTitle ?? activeItem.label)}
              </h1>
            </div>
          </div>
          <div className="workspace-shell__topbar-end">
            {(headerTools !== undefined || screenToolbar) && (
              <div className="workspace-shell__topbar-tools">
                {headerTools ?? (
                  <span className="workspace-shell__branch-label">
                    {topbarBranchName}
                  </span>
                )}
              </div>
            )}
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
          </div>
          {screenToolbar && (
            <>
              <div
                className="workspace-shell__header-control"
                ref={setHeaderControlTarget}
              />
              <div
                className="workspace-shell__screen-toolbar"
                ref={setToolbarTarget}
              />
            </>
          )}
        </header>

        <ScreenToolbarContext.Provider
          value={screenToolbar ? toolbarTarget : undefined}
        >
          <ScreenHeaderControlContext.Provider
            value={screenToolbar ? headerControlTarget : undefined}
          >
            <div className="workspace-shell__content">{children}</div>
          </ScreenHeaderControlContext.Provider>
        </ScreenToolbarContext.Provider>
      </main>

      {!mobileWorkspaceRole && (
        <nav
          aria-label={`${workspaceLabel} 모바일 메뉴`}
          className="workspace-shell__bottom-navigation"
        >
          {navigation.map((item) => (
            <WorkspaceNavigationLink compact item={item} key={item.to} />
          ))}
        </nav>
      )}
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
