import { MEMBER_ROLES, type MemberRole } from '../../../../core/session';
import type { BranchResponse } from '../../../../features/branches/branches-api';
import type {
  CurrentMemberInput,
  MemberResponse,
} from '../../../../features/members/members-api';
import { hasSeat } from './admin-members';
import type { SeatChoice } from './member-seat-options';

export const CURRENT_MEMBER_NAME_MAX_LENGTH = 50;

export type CurrentMemberDraft = {
  branchId: number;
  certificationId: number | null;
  joinDate: string;
  name: string;
  preparingCertifications: string;
  role: MemberRole;
  seatNumber: number | null;
};

export type CurrentMemberDraftErrors = {
  branchId?: string;
  certificationId?: string;
  joinDate?: string;
  name?: string;
  role?: string;
  seatNumber?: string;
};

export function draftFromCurrentMember(
  member: MemberResponse,
): CurrentMemberDraft {
  return {
    branchId: member.branchId,
    certificationId: member.certificationId,
    joinDate: member.joinDate ?? '',
    name: member.name,
    preparingCertifications: member.preparingCertifications ?? '',
    role: member.role,
    seatNumber: hasSeat(member.seatNumber) ? member.seatNumber : null,
  };
}

export function validateCurrentMemberDraft(
  draft: CurrentMemberDraft,
  branches: readonly BranchResponse[],
  seatChoices: readonly SeatChoice[],
  destinationRoster: readonly MemberResponse[] | null,
  target: Pick<MemberResponse, 'branchId' | 'id' | 'name'>,
): CurrentMemberDraftErrors {
  const errors: CurrentMemberDraftErrors = {};
  const name = draft.name.trim();
  const loginIdentityChanged =
    draft.branchId !== target.branchId || name !== target.name.trim();

  if (!branches.some((branch) => branch.id === draft.branchId)) {
    errors.branchId = '운영 가능한 지점을 선택해 주세요.';
  }

  if (!MEMBER_ROLES.includes(draft.role)) {
    errors.role = '사원 구분을 다시 선택해 주세요.';
  }

  if (name === '') {
    errors.name = '이름을 입력해 주세요.';
  } else if (name.length > CURRENT_MEMBER_NAME_MAX_LENGTH) {
    errors.name = `이름은 ${CURRENT_MEMBER_NAME_MAX_LENGTH}자를 넘을 수 없어요.`;
  } else if (loginIdentityChanged && destinationRoster === null) {
    errors.name = '선택한 지점의 이름 사용 여부를 확인하는 중이에요.';
  } else if (
    loginIdentityChanged &&
    destinationRoster !== null &&
    destinationRoster.some(
      (member) => member.id !== target.id && member.name.trim() === name,
    )
  ) {
    errors.name = '이 지점에서 이미 사용 중인 이름이에요.';
  }

  if (draft.joinDate === '') {
    errors.joinDate = '입사일을 입력해 주세요.';
  } else if (!isCalendarDate(draft.joinDate)) {
    errors.joinDate = '입사일을 YYYY-MM-DD 형식의 날짜로 입력해 주세요.';
  }

  if (
    draft.certificationId !== null &&
    (!Number.isInteger(draft.certificationId) || draft.certificationId <= 0)
  ) {
    errors.certificationId = '자격증을 다시 선택해 주세요.';
  }

  if (draft.seatNumber !== null) {
    const choice = seatChoices.find(
      (candidate) => candidate.number === draft.seatNumber,
    );

    if (choice === undefined || choice.state === 'taken') {
      errors.seatNumber =
        '이미 사용 중이거나 배치도에 없는 좌석이에요. 다른 좌석을 선택해 주세요.';
    }
  }

  return errors;
}

export function hasCurrentMemberDraftErrors(errors: CurrentMemberDraftErrors) {
  return Object.keys(errors).length > 0;
}

export function toCurrentMemberInput(
  draft: CurrentMemberDraft,
): CurrentMemberInput {
  return {
    branchId: draft.branchId,
    certificationId: draft.certificationId,
    joinDate: draft.joinDate,
    name: draft.name.trim(),
    preparingCertifications:
      draft.preparingCertifications.trim() === ''
        ? null
        : draft.preparingCertifications,
    role: draft.role,
    seatNumber: draft.seatNumber,
  };
}

export function currentMemberDraftSignature(draft: CurrentMemberDraft) {
  const input = toCurrentMemberInput(draft);

  return JSON.stringify([
    input.branchId,
    input.name,
    input.role,
    input.seatNumber,
    input.joinDate,
    input.certificationId,
    input.preparingCertifications,
  ]);
}

/** `2026-02-30` has the right shape but is not a real calendar date. */
function isCalendarDate(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);

  if (match === null) {
    return false;
  }

  const [year, month, day] = [
    Number(match[1]),
    Number(match[2]),
    Number(match[3]),
  ];
  const date = new Date(Date.UTC(year, month - 1, day));

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}
