import { Navigate, Route, Routes } from 'react-router-dom';
import { useSession } from '../session';
import { AdminHomeScreen } from '../../screens/admin/AdminHomeScreen';
import { AdminWorkspaceScreen } from '../../screens/admin/AdminWorkspaceScreen';
import { AuthScreen } from '../../screens/auth/AuthScreen';
import { UiKitScreen } from '../../screens/dev/UiKitScreen';
import { MemberHomeScreen } from '../../screens/member/MemberHomeScreen';
import { MemberPlans } from '../../screens/member/plans';
import { MemberWorkspaceScreen } from '../../screens/member/MemberWorkspaceScreen';
import { WorkspacePlaceholderScreen } from '../../screens/workspace/WorkspacePlaceholderScreen';
import { StaffHomeScreen } from '../../screens/staff/StaffHomeScreen';
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
          <Route
            path="study"
            element={
              <WorkspacePlaceholderScreen
                description="입실부터 퇴실까지 인정된 학습 시간을 일·주·월 단위로 확인합니다."
                eyebrow="MEMBER · STUDY"
                title="학습 기록"
              />
            }
          />
          <Route
            path="more"
            element={
              <WorkspacePlaceholderScreen
                description="휴무 신청, 요청 내역과 내 정보를 관리합니다."
                eyebrow="MEMBER · MORE"
                title="더보기"
              />
            }
          />
          <Route
            path="*"
            element={<Navigate replace to={appRoutes.member} />}
          />
        </Route>
      </Route>

      <Route element={<ProtectedRoute allowedRoles={['STAFF']} />}>
        <Route path={appRoutes.staff} element={<StaffWorkspaceScreen />}>
          <Route index element={<StaffHomeScreen />} />
          <Route
            path="attendance"
            element={
              <WorkspacePlaceholderScreen
                description="회원 입실·퇴실과 현장 출석 상태를 확인합니다."
                eyebrow="STAFF · ATTENDANCE"
                title="출석"
              />
            }
          />
          <Route
            path="beverages"
            element={
              <WorkspacePlaceholderScreen
                description="음료 제조 수량과 두 작업실의 서빙 좌석표를 관리합니다."
                eyebrow="STAFF · BEVERAGE"
                title="음료"
              />
            }
          />
          <Route
            path="operations"
            element={
              <WorkspacePlaceholderScreen
                description="스텝 휴무와 반찬 신청 등 현장 운영 업무를 관리합니다."
                eyebrow="STAFF · OPERATIONS"
                title="운영"
              />
            }
          />
          <Route path="*" element={<Navigate replace to={appRoutes.staff} />} />
        </Route>
      </Route>

      <Route element={<ProtectedRoute allowedRoles={['ADMIN']} />}>
        <Route path={appRoutes.admin} element={<AdminWorkspaceScreen />}>
          <Route index element={<AdminHomeScreen />} />
          <Route
            path="members"
            element={
              <WorkspacePlaceholderScreen
                description="사전등록 대기와 현재 사원 정보를 지점 단위로 관리합니다."
                eyebrow="ADMIN · MEMBERS"
                title="사원 관리"
              />
            }
          />
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
