import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { SessionOwnerKey } from '../../../../core/session';
import { certificationQueryKeys } from '../../../../features/certifications/certification-query-keys';
import { fetchCertifications } from '../../../../features/certifications/certifications-api';
import { memberQueryKeys } from '../../../../features/members/member-query-keys';
import {
  fetchBranchMembers,
  fetchPendingPreRegistrations,
} from '../../../../features/members/members-api';
import {
  buildCertificationLookup,
  filterRows,
  isFilterActive,
  sortCurrentMembers,
  sortPendingRegistrations,
  splitCurrentMembers,
  type AdminMemberFilter,
  type AdminMemberRoleFilter,
  type AdminMembersView,
} from '../model/admin-members';

/* A roster changes when someone is registered or signs up, not by the minute. */
const ROSTER_STALE_TIME_MS = 60 * 1_000;
const CERTIFICATIONS_STALE_TIME_MS = 30 * 60 * 1_000;
const MEMBERS_PER_PAGE = 20;

type UseAdminMembersArgs = {
  branchId: number;
  memberId: number;
  ownerKey: SessionOwnerKey;
};

/**
 * Server state for one operating branch. The roster and the pending list are
 * always fetched together because "current" is defined as roster minus
 * pending: until both have answered, nobody is labelled a current member.
 */
export function useAdminMembers({
  branchId,
  memberId,
  ownerKey,
}: UseAdminMembersArgs) {
  const [view, setView] = useState<AdminMembersView>('current');
  const [query, setQuery] = useState('');
  const [role, setRole] = useState<AdminMemberRoleFilter>('ALL');
  const [page, setPage] = useState(1);

  const membersQuery = useQuery({
    queryFn: () => fetchBranchMembers(branchId, memberId),
    queryKey: memberQueryKeys.branch(ownerKey, branchId),
    refetchOnWindowFocus: 'always',
    staleTime: ROSTER_STALE_TIME_MS,
  });
  const pendingQuery = useQuery({
    queryFn: () => fetchPendingPreRegistrations(branchId, memberId),
    queryKey: memberQueryKeys.pending(ownerKey, branchId),
    refetchOnWindowFocus: 'always',
    staleTime: ROSTER_STALE_TIME_MS,
  });
  const certificationQuery = useQuery({
    queryFn: fetchCertifications,
    queryKey: certificationQueryKeys.all(),
    staleTime: CERTIFICATIONS_STALE_TIME_MS,
  });

  const currentRows = useMemo(
    () =>
      membersQuery.data !== undefined && pendingQuery.data !== undefined
        ? sortCurrentMembers(
            splitCurrentMembers(membersQuery.data, pendingQuery.data),
          )
        : null,
    [membersQuery.data, pendingQuery.data],
  );
  const pendingRows = useMemo(
    () =>
      pendingQuery.data !== undefined
        ? sortPendingRegistrations(pendingQuery.data)
        : null,
    [pendingQuery.data],
  );

  const filter = useMemo<AdminMemberFilter>(
    () => ({ query, role }),
    [query, role],
  );
  const visibleCurrent = useMemo(
    () => (currentRows === null ? null : filterRows(currentRows, filter)),
    [currentRows, filter],
  );
  const visiblePending = useMemo(
    () => (pendingRows === null ? null : filterRows(pendingRows, filter)),
    [filter, pendingRows],
  );

  /* Search and sort the complete roster before taking the visible page. */
  const matchingRows = view === 'current' ? visibleCurrent : visiblePending;
  const matchingTotal = matchingRows?.length ?? 0;
  const pageCount = Math.max(1, Math.ceil(matchingTotal / MEMBERS_PER_PAGE));
  const currentPage = Math.min(page, pageCount);
  const pageOffset = (currentPage - 1) * MEMBERS_PER_PAGE;

  /* Persist a clamp after removal, so a later refresh cannot resurrect an
     out-of-range page. Branch/session changes already remount this hook. */
  if (matchingRows !== null && page !== currentPage) {
    setPage(currentPage);
  }

  const certificationLookup = useMemo(
    () =>
      buildCertificationLookup(
        certificationQuery.data,
        certificationQuery.isError
          ? 'error'
          : certificationQuery.isPending
            ? 'loading'
            : 'ready',
      ),
    [
      certificationQuery.data,
      certificationQuery.isError,
      certificationQuery.isPending,
    ],
  );

  const clearFilter = () => {
    setQuery('');
    setRole('ALL');
    setPage(1);
  };

  const refreshRoster = () => {
    void membersQuery.refetch();
    void pendingQuery.refetch();
  };

  const refresh = () => {
    refreshRoster();
    void certificationQuery.refetch();
  };

  const membersError = membersQuery.isError ? membersQuery.error.message : null;
  const pendingError = pendingQuery.isError ? pendingQuery.error.message : null;

  return {
    certifications: {
      errorMessage: certificationQuery.isError
        ? certificationQuery.error.message
        : null,
      lookup: certificationLookup,
      onRetry: () => void certificationQuery.refetch(),
    },
    counts: {
      current: currentRows?.length ?? null,
      pending: pendingRows?.length ?? null,
    },
    current: {
      /*
       * A pending failure is reported here too: without that list the roster
       * cannot be split, and an unsplit roster must not be called "current".
       */
      errorMessage:
        membersError ??
        (pendingError === null
          ? null
          : `등록 대기 목록을 불러오지 못해 현재 사원을 나눌 수 없어요. ${pendingError}`),
      loading: membersQuery.isPending || pendingQuery.isPending,
      onRetry: refreshRoster,
      filteredTotal: visibleCurrent?.length ?? null,
      rows:
        visibleCurrent?.slice(pageOffset, pageOffset + MEMBERS_PER_PAGE) ??
        null,
      total: currentRows?.length ?? null,
    },
    /** Complete validated current roster, before search/role filtering. */
    currentMembers: currentRows,
    filter,
    filterActive: isFilterActive(filter),
    onClearFilter: clearFilter,
    onQueryChange: (nextQuery: string) => {
      setQuery(nextQuery);
      setPage(1);
    },
    onRefresh: refresh,
    onRoleChange: (nextRole: AdminMemberRoleFilter) => {
      setRole(nextRole);
      setPage(1);
    },
    onViewChange: (nextView: AdminMembersView) => {
      setView(nextView);
      setPage(1);
    },
    pagination: {
      end: Math.min(pageOffset + MEMBERS_PER_PAGE, matchingTotal),
      onPageChange: (nextPage: number) => {
        setPage(Math.max(1, Math.min(nextPage, pageCount)));
      },
      page: currentPage,
      pageCount,
      start: matchingTotal === 0 ? 0 : pageOffset + 1,
      total: matchingTotal,
    },
    pending: {
      errorMessage: pendingError,
      loading: pendingQuery.isPending,
      onRetry: () => void pendingQuery.refetch(),
      filteredTotal: visiblePending?.length ?? null,
      rows:
        visiblePending?.slice(pageOffset, pageOffset + MEMBERS_PER_PAGE) ??
        null,
      total: pendingRows?.length ?? null,
    },
    refreshing:
      (membersQuery.isFetching && membersQuery.data !== undefined) ||
      (pendingQuery.isFetching && pendingQuery.data !== undefined),
    /** The pending list exactly as validated for this branch; writes check their target against it. */
    registrations: pendingQuery.data ?? null,
    view,
  };
}

export type AdminMembersState = ReturnType<typeof useAdminMembers>;
