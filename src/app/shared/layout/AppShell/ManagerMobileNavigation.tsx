import { Link, useLocation } from 'react-router-dom';
import { cx } from '../../lib/cx';
import {
  getManagerMobileNavigation,
  getManagerMobileSection,
  type ManagerWorkspaceRole,
} from './manager-mobile-navigation';

type ManagerMobileNavigationProps = {
  branchName: string;
  role: ManagerWorkspaceRole;
};

export function ManagerMobileNavigation({
  branchName,
  role,
}: ManagerMobileNavigationProps) {
  const location = useLocation();
  const navigation = getManagerMobileNavigation(role)!;
  const active = getManagerMobileSection(role, location.pathname);

  return (
    <nav
      aria-label="모바일 주요 메뉴"
      className={cx(
        'manager-mobile-navigation',
        role === 'STAFF' && 'manager-mobile-navigation--staff',
      )}
    >
      {navigation.adminHub && (
        <Link
          aria-current={active === 'admin' ? 'page' : undefined}
          className={cx(active === 'admin' && 'is-active')}
          to={navigation.adminHub}
        >
          관리자
        </Link>
      )}
      <Link
        aria-current={active === 'attendance' ? 'page' : undefined}
        className={cx(
          'manager-mobile-navigation__attendance',
          active === 'attendance' && 'is-active',
        )}
        to={navigation.attendance}
      >
        <strong>출석</strong>
        {active === 'attendance' && (
          <small title={branchName}>{branchName}</small>
        )}
      </Link>
      <Link
        aria-current={active === 'staff' ? 'page' : undefined}
        className={cx(active === 'staff' && 'is-active')}
        to={navigation.staffHub}
      >
        스태프
      </Link>
    </nav>
  );
}
