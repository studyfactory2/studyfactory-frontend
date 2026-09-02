import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, type ReactNode } from 'react';
import { useSession } from '../session';

type SessionQueryBoundaryProps = {
  children: ReactNode;
};

export function SessionQueryBoundary({ children }: SessionQueryBoundaryProps) {
  const queryClient = useQueryClient();
  const { ownerKey } = useSession();
  const previousOwnerKeyRef = useRef(ownerKey);

  useEffect(() => {
    const previousOwnerKey = previousOwnerKeyRef.current;
    previousOwnerKeyRef.current = ownerKey;

    if (!previousOwnerKey || previousOwnerKey === ownerKey) {
      return;
    }

    const previousOwnerQueryKey = ['private', previousOwnerKey] as const;

    void queryClient.cancelQueries({ queryKey: previousOwnerQueryKey });
    queryClient.removeQueries({ queryKey: previousOwnerQueryKey });
  }, [ownerKey, queryClient]);

  return children;
}
