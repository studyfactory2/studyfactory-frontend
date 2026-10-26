import { Outlet, useLocation } from 'react-router-dom';
import { memberRoutes } from '../../core/router/routes';
import { AppShell } from '../../shared/layout/AppShell/AppShell';
import { memberNavigation } from './member-navigation';

export function MemberWorkspaceScreen() {
  const { pathname } = useLocation();
  return (
    <AppShell
      navigation={memberNavigation}
      pageTitle={pathname === memberRoutes.tasks ? '할 일' : undefined}
      workspaceLabel="회원"
    >
      <Outlet />
    </AppShell>
  );
}
