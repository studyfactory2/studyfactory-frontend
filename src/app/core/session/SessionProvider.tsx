import { useSyncExternalStore, type ReactNode } from 'react';
import {
  getCurrentSession,
  getServerSession,
  subscribeSession,
} from './session-store';
import { SessionContext } from './session-context';

export function SessionProvider({ children }: { children: ReactNode }) {
  const session = useSyncExternalStore(
    subscribeSession,
    getCurrentSession,
    getServerSession,
  );

  return (
    <SessionContext.Provider value={session}>
      {children}
    </SessionContext.Provider>
  );
}
