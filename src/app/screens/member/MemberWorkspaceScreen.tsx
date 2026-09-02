import { Outlet } from 'react-router-dom';
import { AppShell } from '../../shared/layout/AppShell/AppShell';
import { memberNavigation } from './member-navigation';

export function MemberWorkspaceScreen() {
  return (
    <AppShell navigation={memberNavigation} workspaceLabel="회원">
      <Outlet />
    </AppShell>
  );
}
