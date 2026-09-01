import { Outlet } from 'react-router-dom';
import { AppShell } from '../../layouts/AppShell';
import { memberNavigation } from '../../navigation/member-navigation';

export function MemberWorkspaceScreen() {
  return (
    <AppShell navigation={memberNavigation} workspaceLabel="회원">
      <Outlet />
    </AppShell>
  );
}
