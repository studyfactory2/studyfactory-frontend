import { Outlet } from 'react-router-dom';
import { AppShell } from '../../shared/layout/AppShell/AppShell';
import { staffNavigation } from './staff-navigation';

export function StaffWorkspaceScreen() {
  return (
    <AppShell navigation={staffNavigation} workspaceLabel="스텝">
      <Outlet />
    </AppShell>
  );
}
