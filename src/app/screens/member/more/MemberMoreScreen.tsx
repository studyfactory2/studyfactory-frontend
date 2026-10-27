import { Navigate, useLocation } from 'react-router-dom';
import { memberRoutes } from '../../../core/router/routes';

/** Keep old dashboard bookmarks working; all child feature URLs stay intact. */
export function MemberMoreScreen() {
  const { search, hash } = useLocation();

  return (
    <Navigate replace to={{ pathname: memberRoutes.home, search, hash }} />
  );
}
