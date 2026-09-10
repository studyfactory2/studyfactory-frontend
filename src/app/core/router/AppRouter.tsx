import { Navigate, Route, Routes } from 'react-router-dom';
import { useSession } from '../session';
import { AdminHomeScreen } from '../../screens/admin/AdminHomeScreen';
import { AdminMembersScreen } from '../../screens/admin/members';
import { AdminWorkspaceScreen } from '../../screens/admin/AdminWorkspaceScreen';
import { AuthScreen } from '../../screens/auth/AuthScreen';
import { UiKitScreen } from '../../screens/dev/UiKitScreen';
import { MemberHomeScreen } from '../../screens/member/home';
import { MemberBeveragesScreen } from '../../screens/member/more/beverages';
import { MemberLeavesScreen } from '../../screens/member/more/leaves';
import { MemberMoreScreen } from '../../screens/member/more';
import { MemberProfileScreen } from '../../screens/member/more/profile';
import { MemberSideDishesScreen } from '../../screens/member/more/sidedishes';
import { MemberSuggestionsScreen } from '../../screens/member/more/suggestions';
import { MemberPlans } from '../../screens/member/plans';
import { MemberStudyScreen } from '../../screens/member/study';
import { MemberWorkspaceScreen } from '../../screens/member/MemberWorkspaceScreen';
import { WorkspacePlaceholderScreen } from '../../screens/workspace/WorkspacePlaceholderScreen';
import { StaffBeveragesScreen } from '../../screens/staff/beverages';
import { StaffAttendanceScreen } from '../../screens/staff/attendance';
import { StaffHomeScreen } from '../../screens/staff/home';
import { StaffOperationsScreen } from '../../screens/staff/operations';
import { StaffWorkspaceScreen } from '../../screens/staff/StaffWorkspaceScreen';
import { getRoleHomePath, appRoutes } from './routes';
import { ProtectedRoute } from './ProtectedRoute';

export function AppRouter() {
  return (
    <Routes>
      <Route path="/" element={<HomeRedirect />} />
      <Route path={appRoutes.login} element={<AuthScreen />} />

      <Route element={<ProtectedRoute allowedRoles={['MEMBER']} />}>
        <Route path={appRoutes.member} element={<MemberWorkspaceScreen />}>
          <Route index element={<MemberHomeScreen />} />
          <Route path="plans" element={<MemberPlans />} />
          <Route path="study" element={<MemberStudyScreen />} />
          <Route path="more">
            <Route index element={<MemberMoreScreen />} />
            <Route path="beverages" element={<MemberBeveragesScreen />} />
            <Route path="leaves" element={<MemberLeavesScreen />} />
            <Route path="profile" element={<MemberProfileScreen />} />
            <Route path="side-dishes" element={<MemberSideDishesScreen />} />
            <Route path="suggestions" element={<MemberSuggestionsScreen />} />
          </Route>
          <Route
            path="*"
            element={<Navigate replace to={appRoutes.member} />}
          />
        </Route>
      </Route>

      <Route element={<ProtectedRoute allowedRoles={['STAFF']} />}>
        <Route path={appRoutes.staff} element={<StaffWorkspaceScreen />}>
          <Route index element={<StaffHomeScreen />} />
          <Route path="attendance" element={<StaffAttendanceScreen />} />
          <Route path="beverages" element={<StaffBeveragesScreen />} />
          <Route path="operations" element={<StaffOperationsScreen />} />
          <Route path="*" element={<Navigate replace to={appRoutes.staff} />} />
        </Route>
      </Route>

      <Route element={<ProtectedRoute allowedRoles={['ADMIN']} />}>
        <Route path={appRoutes.admin} element={<AdminWorkspaceScreen />}>
          <Route index element={<AdminHomeScreen />} />
          <Route path="members" element={<AdminMembersScreen />} />
          <Route
            path="attendance"
            element={
              <WorkspacePlaceholderScreen
                description="출석부, 회원 건의와 반찬 신청 내역을 확인합니다."
                eyebrow="ADMIN · ATTENDANCE"
                title="출석"
              />
            }
          />
          <Route
            path="operations"
            element={
              <WorkspacePlaceholderScreen
                description="사원별 휴가, 기타 휴무와 계획 현황을 관리합니다."
                eyebrow="ADMIN · OPERATIONS"
                title="운영"
              />
            }
          />
          <Route path="*" element={<Navigate replace to={appRoutes.admin} />} />
        </Route>
      </Route>

      {import.meta.env.DEV && (
        <Route path="/dev/kit" element={<UiKitScreen />} />
      )}

      <Route path="*" element={<HomeRedirect />} />
    </Routes>
  );
}

function HomeRedirect() {
  const session = useSession();

  if (session.isAuthenticated && session.role) {
    return <Navigate replace to={getRoleHomePath(session.role)} />;
  }

  return <Navigate replace to={appRoutes.login} />;
}
