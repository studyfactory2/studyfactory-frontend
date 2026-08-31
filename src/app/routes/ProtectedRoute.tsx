import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useSession } from '../auth/session';
import { appRoutes, getRoleHomePath } from '../config/routes';
import type { MemberRole } from '../auth/types';

type ProtectedRouteProps = {
  allowedRoles: MemberRole[];
};

export function ProtectedRoute({ allowedRoles }: ProtectedRouteProps) {
  const location = useLocation();
  const session = useSession();

  if (!session.accessToken || !session.role) {
    return (
      <Navigate
        replace
        state={{ from: location.pathname }}
        to={appRoutes.login}
      />
    );
  }

  if (!allowedRoles.includes(session.role)) {
    return <Navigate replace to={getRoleHomePath(session.role)} />;
  }

  return <Outlet />;
}
