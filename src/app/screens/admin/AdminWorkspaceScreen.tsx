import { Outlet } from 'react-router-dom';
import { AppShell } from '../../layouts/AppShell';
import { adminNavigation } from '../../navigation/admin-navigation';

export function AdminWorkspaceScreen() {
  return (
    <AppShell navigation={adminNavigation} workspaceLabel="지점 관리자">
      <Outlet />
    </AppShell>
  );
}
