import { useQuery } from '@tanstack/react-query';
import type { SessionOwnerKey } from '../../../../core/session';
import { fetchStudyPresenceDoorQr } from '../../../../features/study-presence/study-presence-api';
import { studyPresenceQueryKeys } from '../../../../features/study-presence/study-presence-query-keys';

type UseAdminDoorQrArgs = {
  branchId: number;
  memberId: number;
  ownerKey: SessionOwnerKey;
};

export function useAdminDoorQr({
  branchId,
  memberId,
  ownerKey,
}: UseAdminDoorQrArgs) {
  const query = useQuery({
    gcTime: 0,
    queryFn: () => fetchStudyPresenceDoorQr(branchId, memberId),
    queryKey: studyPresenceQueryKeys.doorQr(ownerKey, branchId),
    refetchOnMount: 'always',
    refetchOnWindowFocus: 'always',
    staleTime: 0,
  });

  return {
    errorMessage: query.isError ? query.error.message : null,
    loading: query.isPending,
    onRefresh: () => void query.refetch(),
    onRetry: () => void query.refetch(),
    qrToken: query.isError ? null : (query.data?.qrToken ?? null),
    refreshing: query.isFetching && query.data !== undefined,
  };
}

export type AdminDoorQrState = ReturnType<typeof useAdminDoorQr>;
