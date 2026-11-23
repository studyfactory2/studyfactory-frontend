import { useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { SessionOwnerKey } from '../../../../core/session';
import {
  BEVERAGE_NAME_MAX_LENGTH,
  BEVERAGE_NOTE_MAX_LENGTH,
} from '../../../../features/beverages/beverage-constraints';
import { beverageQueryKeys } from '../../../../features/beverages/beverage-query-keys';
import {
  fetchMemberBeverages,
  type BeverageItemInput,
} from '../../../../features/beverages/beverages-api';
import {
  beverageItemsSignature,
  cleanBeverageItems,
  type MemberBeverageChange,
  type MemberBeverageDraftItem,
} from '../model/current-member-beverages';

type BeverageDraft = {
  originalItems: BeverageItemInput[];
  items: MemberBeverageDraftItem[];
};

export function useCurrentMemberBeverages({
  branchId,
  memberId,
  ownerKey,
  targetMemberId,
}: {
  branchId: number;
  memberId: number;
  ownerKey: SessionOwnerKey;
  targetMemberId: number;
}) {
  const [draft, setDraft] = useState<BeverageDraft | null>(null);
  const nextKey = useRef(0);
  const query = useQuery({
    queryKey: beverageQueryKeys.members(ownerKey, branchId),
    queryFn: () => fetchMemberBeverages(branchId, memberId),
    refetchOnMount: 'always',
    refetchOnWindowFocus: false,
    staleTime: 0,
  });
  const member = query.data?.find((row) => row.memberId === targetMemberId);
  const ready = query.isFetchedAfterMount && query.isSuccess && !!member;
  const serverItems = member?.items ?? [];
  const items =
    draft?.items ??
    serverItems.map((item, index) => ({
      key: `stored-${item.id ?? index}`,
      name: item.name,
      note: item.note,
    }));
  const cleaned = cleanBeverageItems(items);
  const dirty =
    draft !== null &&
    beverageItemsSignature(cleaned) !==
      beverageItemsSignature(draft.originalItems);
  const invalid = cleaned.some(
    (item) =>
      item.name.length === 0 ||
      item.name.length > BEVERAGE_NAME_MAX_LENGTH ||
      (item.note?.length ?? 0) > BEVERAGE_NOTE_MAX_LENGTH,
  );

  const edit = (
    update: (current: MemberBeverageDraftItem[]) => MemberBeverageDraftItem[],
  ) => {
    if (!ready) return;
    setDraft((current) => ({
      originalItems: current?.originalItems ?? cleanBeverageItems(serverItems),
      items: update(current?.items ?? items),
    }));
  };

  return {
    change:
      dirty && draft !== null
        ? ({
            originalItems: draft.originalItems,
            items: cleaned,
          } satisfies MemberBeverageChange)
        : null,
    dirty,
    invalid,
    items,
    ready,
    loading:
      query.isPending || (!query.isFetchedAfterMount && query.isFetching),
    errorMessage: query.isError
      ? query.error.message
      : query.isFetchedAfterMount && !member
        ? '이 사원의 음료 정보를 찾을 수 없어요. 다시 불러와 주세요.'
        : null,
    onRetry: () => void query.refetch(),
    onAdd: (name: string) => {
      const trimmed = name.trim();
      if (!trimmed) return;
      const key = `draft-${nextKey.current++}`;
      edit((current) => [...current, { key, name: trimmed, note: null }]);
    },
    onPatch: (key: string, patch: Partial<BeverageItemInput>) =>
      edit((current) =>
        current.map((item) =>
          item.key === key ? { ...item, ...patch } : item,
        ),
      ),
    onRemove: (key: string) =>
      edit((current) => current.filter((item) => item.key !== key)),
    // A profile write can fail after drinks were saved. Keep the profile draft
    // open, but advance this baseline so retrying doesn't repeat that write.
    acceptSaved: (saved: BeverageItemInput[]) =>
      setDraft((current) =>
        current
          ? { ...current, originalItems: cleanBeverageItems(saved) }
          : null,
      ),
  };
}

export type CurrentMemberBeverages = ReturnType<
  typeof useCurrentMemberBeverages
>;
