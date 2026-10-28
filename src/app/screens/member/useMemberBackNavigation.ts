import { useEffect, useRef } from 'react';
import {
  useLocation,
  useNavigate,
  useNavigationType,
  type Location,
} from 'react-router-dom';
import { memberRoutes } from '../../core/router/routes';

const memberPaths = new Set<string>(Object.values(memberRoutes));
const normalizedPath = (pathname: string) => pathname.replace(/\/+$/, '');

/** Only go back through member entries observed during this workspace visit. */
export function useMemberBackNavigation() {
  const location = useLocation();
  const navigate = useNavigate();
  const navigationType = useNavigationType();
  const visits = useRef<{ entries: Location[]; index: number }>({
    entries: [],
    index: -1,
  });

  useEffect(() => {
    const history = visits.current;
    if (history.entries[history.index]?.key === location.key) {
      history.entries[history.index] = location;
      return;
    }

    if (navigationType === 'POP') {
      const index = history.entries.findIndex(
        (entry) => entry.key === location.key,
      );
      if (index !== -1) {
        history.index = index;
        history.entries[index] = location;
        return;
      }
    } else if (navigationType === 'PUSH' && history.index !== -1) {
      history.entries = history.entries.slice(0, history.index + 1);
      history.entries.push(location);
      history.index += 1;
      return;
    } else if (navigationType === 'REPLACE' && history.index !== -1) {
      history.entries[history.index] = location;
      return;
    }

    // A fresh load or an unknown browser-history entry has no safe predecessor.
    visits.current = { entries: [location], index: 0 };
  }, [location, navigationType]);

  return () => {
    const history = visits.current;
    if (history.entries[history.index]?.key === location.key) {
      for (let index = history.index - 1; index >= 0; index -= 1) {
        const path = normalizedPath(history.entries[index].pathname);
        if (!memberPaths.has(path)) break;
        // Date/filter changes stay within one page; Back leaves that page.
        if (path !== normalizedPath(location.pathname)) {
          navigate(index - history.index);
          return;
        }
      }
    }

    navigate(memberRoutes.home, { replace: true });
  };
}
