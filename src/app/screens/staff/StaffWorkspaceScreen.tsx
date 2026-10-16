import { Outlet, useMatch } from 'react-router-dom';
import { staffRoutes } from '../../core/router/routes';
import { AppShell } from '../../shared/layout/AppShell/AppShell';
import { staffNavigation } from './staff-navigation';

export function StaffWorkspaceScreen() {
  const attendanceRoute = useMatch(staffRoutes.attendance) !== null;

  return (
    <AppShell
      navigation={staffNavigation}
      screenToolbar={attendanceRoute}
      workspaceLabel="스텝"
    >
      <Outlet />
    </AppShell>
  );
}
