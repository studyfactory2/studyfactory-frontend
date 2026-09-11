import { useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { SessionOwnerKey } from '../../../core/session';
import { sideDishQueryKeys } from '../../side-dishes/side-dish-query-keys';
import { fetchDailySideDishes } from '../../side-dishes/side-dishes-api';
import { buildAttendanceMealGroup } from '../model/manager-operations';
import { useManagerSuggestions } from './useManagerSuggestions';
import { useManagerTodos } from './useManagerTodos';

const OPERATIONS_REFETCH_MS = 30 * 1_000;
const OPERATIONS_STALE_TIME_MS = 15 * 1_000;

type UseManagerOperationsArgs = {
  branchId: number;
  dateKey: string;
  memberId: number;
  ownerKey: SessionOwnerKey;
};

export function useManagerOperations({
  branchId,
  dateKey,
  memberId,
  ownerKey,
}: UseManagerOperationsArgs) {
  const todos = useManagerTodos({
    branchId,
    initialDateKey: dateKey,
    memberId,
    ownerKey,
  });
  const suggestions = useManagerSuggestions({ branchId, memberId, ownerKey });
  const sideDishQuery = useQuery({
    queryFn: () => fetchDailySideDishes(dateKey, branchId, memberId),
    queryKey: sideDishQueryKeys.daily(ownerKey, branchId, dateKey),
    refetchInterval: OPERATIONS_REFETCH_MS,
    refetchOnWindowFocus: 'always',
    staleTime: OPERATIONS_STALE_TIME_MS,
  });

  const lunch = useMemo(
    () => buildAttendanceMealGroup(sideDishQuery.data ?? [], 'LUNCH'),
    [sideDishQuery.data],
  );
  const dinner = useMemo(
    () => buildAttendanceMealGroup(sideDishQuery.data ?? [], 'DINNER'),
    [sideDishQuery.data],
  );

  const refresh = useCallback(() => {
    todos.today.onRetry();
    suggestions.onRetry();
    void sideDishQuery.refetch();
  }, [sideDishQuery, suggestions, todos]);

  return {
    meals: {
      dinner,
      errorMessage: sideDishQuery.isError ? sideDishQuery.error.message : null,
      loading: sideDishQuery.isPending,
      lunch,
      onRetry: () => void sideDishQuery.refetch(),
      ready: sideDishQuery.data !== undefined,
    },
    onRefresh: refresh,
    suggestions,
    todos,
  };
}
