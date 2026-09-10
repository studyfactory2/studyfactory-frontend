import type { RefObject } from 'react';
import type { MemberRole } from '../../../../core/session';
import type { BranchResponse } from '../../../../features/branches/branches-api';
import { Field, Select } from '../../../../shared/ui';
import { ROLE_LABELS } from '../model/admin-members';
import {
  CURRENT_MEMBER_NAME_MAX_LENGTH,
  type CurrentMemberDraft,
  type CurrentMemberDraftErrors,
} from '../model/current-member-form';

const ROLE_OPTIONS: readonly MemberRole[] = ['MEMBER', 'STAFF', 'ADMIN'];

type CurrentMemberBasicFieldsProps = {
  branches: BranchResponse[];
  draft: CurrentMemberDraft;
  errors: CurrentMemberDraftErrors;
  nameRef: RefObject<HTMLInputElement | null>;
  onBranchChange: (branchId: number) => void;
  onPatch: (changes: Partial<CurrentMemberDraft>) => void;
  saving: boolean;
  branchLocked: boolean;
  selfEditing: boolean;
  showErrors: boolean;
  roleLocked: boolean;
  originalRole: MemberRole;
};

export function CurrentMemberBasicFields({
  branches,
  draft,
  errors,
  nameRef,
  onBranchChange,
  onPatch,
  saving,
  branchLocked,
  selfEditing,
  showErrors,
  roleLocked,
  originalRole,
}: CurrentMemberBasicFieldsProps) {
  return (
    <div className="current-member-form__grid">
      <div className="current-member-form__wide">
        <Field
          error={showErrors ? errors.name : undefined}
          hint="이름은 로그인할 때도 사용돼요. 같은 지점에서는 중복할 수 없어요."
          label="이름"
          required
        >
          {(id) => (
            <input
              autoComplete="off"
              className="control"
              disabled={saving}
              id={id}
              maxLength={CURRENT_MEMBER_NAME_MAX_LENGTH}
              onChange={(event) => onPatch({ name: event.target.value })}
              ref={nameRef}
              type="text"
              value={draft.name}
            />
          )}
        </Field>
      </div>

      <Field
        error={showErrors ? errors.branchId : undefined}
        hint={
          selfEditing
            ? '로그인 중인 관리자 본인의 지점은 잠겨 있어요.'
            : branchLocked
              ? '입실 기록을 안전하게 옮기는 서버 보호 기능을 추가한 뒤 제공할게요.'
              : undefined
        }
        label="지점"
        required
      >
        {(id) => (
          <Select
            disabled={branchLocked || saving}
            id={id}
            onChange={(event) => onBranchChange(Number(event.target.value))}
            value={draft.branchId}
          >
            {branches.map((branch) => (
              <option key={branch.id} value={branch.id}>
                {branch.name}
              </option>
            ))}
          </Select>
        )}
      </Field>

      <Field
        error={showErrors ? errors.role : undefined}
        hint={
          selfEditing
            ? '로그인 중인 관리자 본인의 역할은 잠겨 있어요.'
            : originalRole === 'ADMIN'
              ? '기존 관리자 역할은 계정 안전장치가 추가될 때까지 잠겨 있어요.'
              : undefined
        }
        label="역할"
        required
      >
        {(id) => (
          <Select
            disabled={roleLocked || saving}
            id={id}
            onChange={(event) =>
              onPatch({ role: event.target.value as MemberRole })
            }
            value={draft.role}
          >
            {ROLE_OPTIONS.map((role) => (
              <option key={role} value={role}>
                {ROLE_LABELS[role]}
              </option>
            ))}
          </Select>
        )}
      </Field>

      <div className="current-member-form__wide">
        <Field
          error={showErrors ? errors.joinDate : undefined}
          label="입사일"
          required
        >
          {(id) => (
            <input
              className="control"
              disabled={saving}
              id={id}
              onChange={(event) => onPatch({ joinDate: event.target.value })}
              type="date"
              value={draft.joinDate}
            />
          )}
        </Field>
      </div>
    </div>
  );
}
