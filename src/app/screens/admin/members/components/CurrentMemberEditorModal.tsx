import {
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
  type RefObject,
} from 'react';
import { UserRoundCog } from 'lucide-react';
import type { SessionOwnerKey } from '../../../../core/session';
import type { BranchResponse } from '../../../../features/branches/branches-api';
import type {
  CurrentMemberInput,
  MemberResponse,
} from '../../../../features/members/members-api';
import { Button, Modal } from '../../../../shared/ui';
import type { CurrentMemberEditorMode } from '../hooks/useCurrentMemberMutations';
import { useSeatOptions } from '../hooks/useSeatOptions';
import {
  hasSeat,
  ROLE_LABELS,
  type CertificationLookup,
} from '../model/admin-members';
import {
  currentMemberDraftSignature,
  draftFromCurrentMember,
  hasCurrentMemberDraftErrors,
  toCurrentMemberInput,
  validateCurrentMemberDraft,
  type CurrentMemberDraft,
} from '../model/current-member-form';
import { CurrentMemberBasicFields } from './CurrentMemberBasicFields';
import { CurrentMemberLearningFields } from './CurrentMemberLearningFields';

type CurrentMemberEditorModalProps = {
  branches: BranchResponse[];
  certifications: { lookup: CertificationLookup; onRetry: () => void };
  errorMessage: string | null;
  memberId: number;
  mode: CurrentMemberEditorMode;
  onClose: () => void;
  onSubmit: (input: CurrentMemberInput) => void;
  ownerKey: SessionOwnerKey;
  saving: boolean;
};

/*
 * MemberService currently moves only the member row. Until the backend also
 * protects an active presence session, moving a checked-in member could leave
 * that session attached to the old branch.
 */
const CURRENT_MEMBER_BRANCH_TRANSFER_ENABLED = false;

export function CurrentMemberEditorModal({
  mode,
  onClose,
  saving,
  ...formProps
}: CurrentMemberEditorModalProps) {
  const nameRef = useRef<HTMLInputElement>(null);
  const open = mode.kind === 'edit';
  const member = open ? mode.member : null;

  return (
    <Modal
      closeDisabled={saving}
      initialFocusRef={nameRef}
      onClose={onClose}
      open={open}
      title="사원 정보 수정"
    >
      {member !== null && (
        <CurrentMemberEditorForm
          {...formProps}
          key={member.id}
          member={member}
          nameRef={nameRef}
          onClose={onClose}
          saving={saving}
        />
      )}
    </Modal>
  );
}

type CurrentMemberEditorFormProps = Omit<
  CurrentMemberEditorModalProps,
  'mode'
> & {
  member: MemberResponse;
  nameRef: RefObject<HTMLInputElement | null>;
};

function CurrentMemberEditorForm({
  branches,
  certifications,
  errorMessage,
  member,
  memberId,
  nameRef,
  onClose,
  onSubmit,
  ownerKey,
  saving,
}: CurrentMemberEditorFormProps) {
  const [initialDraft] = useState(() => draftFromCurrentMember(member));
  const [draft, setDraft] = useState(initialDraft);
  const [submitted, setSubmitted] = useState(false);
  const selfEditing = member.id === memberId;
  const branchLocked = !CURRENT_MEMBER_BRANCH_TRANSFER_ENABLED;
  const roleLocked = selfEditing || member.role === 'ADMIN';
  const originalBranch = branches.find(
    (branch) => branch.id === member.branchId,
  );
  const currentSeat = hasSeat(member.seatNumber) ? member.seatNumber : null;
  const seats = useSeatOptions({
    branchId: draft.branchId,
    currentSeat,
    draftSeat: draft.seatNumber,
    exceptMemberId: member.id,
    memberId,
    ownerKey,
  });
  const errors = validateCurrentMemberDraft(
    draft,
    branches,
    seats.choices,
    seats.roster,
    member,
  );
  const invalid = hasCurrentMemberDraftErrors(errors);
  const dirty =
    currentMemberDraftSignature(draft) !==
    currentMemberDraftSignature(initialDraft);
  const currentSeatMissing =
    currentSeat !== null &&
    seats.choices.some(
      (choice) =>
        choice.number === currentSeat && choice.state === 'map-missing',
    );
  const unresolvedCertification =
    member.certificationId !== null &&
    !certifications.lookup.byId.has(member.certificationId)
      ? member.certificationId
      : null;

  const patch = (changes: Partial<CurrentMemberDraft>) =>
    setDraft((current) => ({ ...current, ...changes }));

  const changeBranch = (branchId: number) => {
    setDraft((current) => ({
      ...current,
      branchId,
      seatNumber:
        branchId === member.branchId && hasSeat(member.seatNumber)
          ? member.seatNumber
          : null,
    }));
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitted(true);

    if (saving || invalid || !dirty) {
      return;
    }

    onSubmit(toCurrentMemberInput(draft));
  };

  return (
    <form
      aria-busy={saving}
      className="current-member-form"
      noValidate
      onSubmit={submit}
    >
      <div className="current-member-form__identity">
        <span aria-hidden="true" className="current-member-form__identity-icon">
          <UserRoundCog size={18} />
        </span>
        <span>
          <strong>{member.name}</strong>
          <small>
            {originalBranch?.name ?? `지점 #${member.branchId}`} ·{' '}
            {ROLE_LABELS[member.role]}
          </small>
        </span>
      </div>

      <FormSection disabled={saving} index={1} title="기본 정보">
        <CurrentMemberBasicFields
          branchLocked={branchLocked}
          branches={branches}
          draft={draft}
          errors={errors}
          nameRef={nameRef}
          onBranchChange={changeBranch}
          onPatch={patch}
          originalRole={member.role}
          roleLocked={roleLocked}
          saving={saving}
          selfEditing={selfEditing}
          showErrors={submitted}
        />
      </FormSection>

      <FormSection disabled={saving} index={2} title="학습 · 좌석">
        <CurrentMemberLearningFields
          certifications={certifications}
          currentSeat={currentSeat}
          currentSeatMissing={currentSeatMissing}
          draft={draft}
          errors={errors}
          onPatch={patch}
          saving={saving}
          seats={seats}
          showErrors={submitted}
          unresolvedCertification={unresolvedCertification}
        />
      </FormSection>

      {errorMessage !== null ? (
        <p className="current-member-form__message" role="alert">
          {errorMessage}
        </p>
      ) : submitted && invalid ? (
        <p className="current-member-form__message" role="alert">
          아직 저장할 수 없어요. 표시된 항목을 확인해 주세요.
        </p>
      ) : (
        submitted &&
        !dirty && (
          <p className="current-member-form__message is-quiet" role="status">
            바뀐 내용이 없어요.
          </p>
        )
      )}

      <div className="current-member-form__actions">
        <Button disabled={saving} onClick={onClose} variant="ghost">
          취소
        </Button>
        <Button loading={saving} type="submit">
          저장
        </Button>
      </div>
    </form>
  );
}

function FormSection({
  children,
  disabled = false,
  index,
  title,
}: {
  children: ReactNode;
  disabled?: boolean;
  index: number;
  title: string;
}) {
  return (
    <fieldset className="current-member-form__section" disabled={disabled}>
      <legend className="current-member-form__legend">
        <b>{index}</b>
        {title}
      </legend>
      {children}
    </fieldset>
  );
}
