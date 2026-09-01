import { Outlet } from 'react-router-dom';
import { AppShell } from '../../layouts/AppShell';
import { staffNavigation } from '../../navigation/staff-navigation';

export function StaffWorkspaceScreen() {
  return (
    <AppShell navigation={staffNavigation} workspaceLabel="스텝">
      <Outlet />
    </AppShell>
  );
}
