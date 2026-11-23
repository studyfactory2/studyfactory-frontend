import type { BeverageItemInput } from '../../../../features/beverages/beverages-api';
import type { CurrentMemberInput } from '../../../../features/members/members-api';

export type MemberBeverageDraftItem = BeverageItemInput & { key: string };

export type MemberBeverageChange = {
  originalItems: BeverageItemInput[];
  items: BeverageItemInput[];
};

export type CurrentMemberEditorSubmission = {
  input: CurrentMemberInput;
  profileChanged: boolean;
  beverages: MemberBeverageChange | null;
};

export type CurrentMemberEditorSaveResult = {
  savedBeverages?: BeverageItemInput[];
};

export function cleanBeverageItems(
  items: readonly BeverageItemInput[],
): BeverageItemInput[] {
  return items.map((item) => ({
    name: item.name.trim(),
    note: (item.note ?? '').trim() || null,
  }));
}

/** Order and duplicate cups are significant; only surrounding whitespace isn't. */
export function beverageItemsSignature(items: readonly BeverageItemInput[]) {
  return JSON.stringify(cleanBeverageItems(items));
}
