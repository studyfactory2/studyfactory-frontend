import { Outlet } from 'react-router-dom';
import { AppShell } from '../../shared/layout/AppShell/AppShell';
import { adminNavigation } from './admin-navigation';

export function AdminWorkspaceScreen() {
  return (
    <AppShell navigation={adminNavigation} workspaceLabel="지점 관리자">
      <Outlet />
    </AppShell>
  );
}
