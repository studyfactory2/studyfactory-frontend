import { Navigate, Route, Routes } from 'react-router-dom';
import { useSession } from '../auth/session';
import { getRoleHomePath, appRoutes } from '../config/routes';
import { AdminWorkspaceScreen } from '../screens/admin/AdminWorkspaceScreen';
import { LoginScreen } from '../screens/auth/LoginScreen';
import { MemberWorkspaceScreen } from '../screens/member/MemberWorkspaceScreen';
import { StaffWorkspaceScreen } from '../screens/staff/StaffWorkspaceScreen';
import { ProtectedRoute } from './ProtectedRoute';

export function AppRouter() {
  return (
    <Routes>
      <Route path="/" element={<HomeRedirect />} />
      <Route path={appRoutes.login} element={<LoginScreen />} />

      <Route element={<ProtectedRoute allowedRoles={['MEMBER']} />}>
        <Route
          path={`${appRoutes.member}/*`}
          element={<MemberWorkspaceScreen />}
        />
      </Route>

      <Route element={<ProtectedRoute allowedRoles={['STAFF']} />}>
        <Route
          path={`${appRoutes.staff}/*`}
          element={<StaffWorkspaceScreen />}
        />
      </Route>

      <Route element={<ProtectedRoute allowedRoles={['ADMIN']} />}>
        <Route
          path={`${appRoutes.admin}/*`}
          element={<AdminWorkspaceScreen />}
        />
      </Route>

      <Route path="*" element={<HomeRedirect />} />
    </Routes>
  );
}

function HomeRedirect() {
  const session = useSession();

  if (session.accessToken && session.role) {
    return <Navigate replace to={getRoleHomePath(session.role)} />;
  }

  return <Navigate replace to={appRoutes.login} />;
}
