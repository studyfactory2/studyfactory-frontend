import { Outlet, useLocation } from 'react-router-dom';
import { memberRoutes } from '../../core/router/routes';
import { AppShell } from '../../shared/layout/AppShell/AppShell';
import { memberNavigation } from './member-navigation';
import { useMemberBackNavigation } from './useMemberBackNavigation';

// Shortcut URLs stay stable even though their former More dashboard is gone.
const memberPageTitles: Record<string, string> = {
  [memberRoutes.tasks]: '할 일',
  [memberRoutes.moreLeaves]: '휴무',
  [memberRoutes.moreSideDishes]: '반찬',
  [memberRoutes.moreBeverages]: '음료',
  [memberRoutes.moreSuggestions]: '요청',
  [memberRoutes.moreProfile]: '내 정보',
};

export function MemberWorkspaceScreen() {
  const { pathname } = useLocation();
  const goBack = useMemberBackNavigation();
  const currentPath = pathname.replace(/\/+$/, '');
  return (
    <AppShell
      mobileHomeNavigation={{
        homePath: memberRoutes.home,
        onBack: currentPath === memberRoutes.home ? undefined : goBack,
      }}
      navigation={memberNavigation}
      pageTitle={memberPageTitles[currentPath]}
      workspaceLabel="회원"
    >
      <Outlet />
    </AppShell>
  );
}
