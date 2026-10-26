import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { SessionOwnerKey } from '../../core/session';
import {
  fetchMemberTaskCalendar,
  memberTaskQueryKeys,
  subscribeMemberTaskCalendarChanges,
} from './member-tasks-api';

type Options = {
  memberId: number;
  ownerKey: SessionOwnerKey;
  month: string;
};

export function useMemberTaskCalendar({ memberId, ownerKey, month }: Options) {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: memberTaskQueryKeys.calendar(ownerKey, month),
    queryFn: ({ signal }) =>
      fetchMemberTaskCalendar(month, memberId, ownerKey, signal),
    retry: false,
  });

  useEffect(
    () =>
      subscribeMemberTaskCalendarChanges((changedOwner, changedMonth) => {
        if (changedOwner !== ownerKey || changedMonth !== month) return;
        // Includes newer background day reads, not only this view's writes.
        // Equal/older day revisions do not emit, so this cannot refetch-loop.
        void queryClient.invalidateQueries({
          queryKey: memberTaskQueryKeys.calendar(ownerKey, month),
          exact: true,
        });
      }),
    [queryClient, ownerKey, month],
  );

  return query;
}
