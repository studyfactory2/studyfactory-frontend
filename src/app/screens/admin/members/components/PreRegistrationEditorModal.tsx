import {
  useId,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
  type RefObject,
} from 'react';
import { Building2, Plus, Trash2 } from 'lucide-react';
import type { SessionOwnerKey } from '../../../../core/session';
import { DRINK_QUICK_PICKS } from '../../../../features/beverages/beverage-rules';
import type {
  PreRegistrationInput,
  PreRegistrationResponse,
} from '../../../../features/members/members-api';
import { cx } from '../../../../shared/lib/cx';
import { Button, Field, Input, Modal, Select } from '../../../../shared/ui';
import {
  BEVERAGE_NAME_MAX_LENGTH,
  BEVERAGE_NOTE_MAX_LENGTH,
} from '../../../member/more/beverages/model/beverage.types';
import type { PreRegistrationEditorMode } from '../hooks/useAdminMemberMutations';
import { useSeatOptions } from '../hooks/useSeatOptions';
import { hasSeat, type CertificationLookup } from '../model/admin-members';
import {
  createDrinkDraft,
  createEmptyDraft,
  describeSeatChoice,
  draftFromRegistration,
  draftSignature,
  hasDraftErrors,
  isCertificationResolved,
  PRE_REGISTRATION_CERTIFICATION_MAX_LENGTH,
  PRE_REGISTRATION_NAME_MAX_LENGTH,
  resolveCertificationDraft,
  toPreRegistrationInput,
  validateDraft,
  type DrinkDraft,
  type PreRegistrationDraft,
} from '../model/pre-registration-form';

type PreRegistrationEditorModalProps = {
  branchId: number;
  branchName: string;
  certifications: { lookup: CertificationLookup; onRetry: () => void };
  /** The last write's failure, shown inside the modal beside the buttons. */
  errorMessage: string | null;
  memberId: number;
  mode: PreRegistrationEditorMode;
  onClose: () => void;
  onSubmit: (input: PreRegistrationInput) => void;
  ownerKey: SessionOwnerKey;
  saving: boolean;
};

/**
 * One form for creating and editing a pending MEMBER pre-registration. The
 * modal owns the frame and the focus; the form below owns the draft, which
 * lives only while the modal is open and is keyed by the record, so a roster
 * refetch in the background never resets what the operator is typing.
 */
export function PreRegistrationEditorModal({
  mode,
  onClose,
  saving,
  ...formProps
}: PreRegistrationEditorModalProps) {
  const nameRef = useRef<HTMLInputElement>(null);
  const open = mode.kind !== 'closed';
  const registration = mode.kind === 'edit' ? mode.registration : null;

  return (
    <Modal
      closeDisabled={saving}
      initialFocusRef={nameRef}
      onClose={onClose}
      open={open}
      title={registration === null ? '회원 사전등록' : '사전등록 수정'}
    >
      {open && (
        <EditorForm
          {...formProps}
          key={registration === null ? 'create' : `edit-${registration.id}`}
          nameRef={nameRef}
          onClose={onClose}
          registration={registration}
          saving={saving}
        />
      )}
    </Modal>
  );
}

type EditorFormProps = Omit<PreRegistrationEditorModalProps, 'mode'> & {
  nameRef: RefObject<HTMLInputElement | null>;
  registration: PreRegistrationResponse | null;
};

function EditorForm({
  branchId,
  branchName,
  certifications,
  errorMessage,
  memberId,
  nameRef,
  onClose,
  onSubmit,
  ownerKey,
  registration,
  saving,
}: EditorFormProps) {
  const [initialDraft] = useState<PreRegistrationDraft>(() =>
    registration === null
      ? createEmptyDraft()
      : draftFromRegistration(
          registration,
          registration.certificationId === null
            ? null
            : (certifications.lookup.byId.get(registration.certificationId) ??
                null),
        ),
  );
  const [draft, setDraft] = useState(initialDraft);
  const [submitted, setSubmitted] = useState(false);
  const [customDrink, setCustomDrink] = useState('');
  const datalistId = useId();

  const currentSeat =
    registration !== null && hasSeat(registration.seatNumber)
      ? registration.seatNumber
      : null;
  const seats = useSeatOptions({
    branchId,
    currentSeat,
    draftSeat: draft.seatNumber,
    exceptMemberId: registration?.id ?? null,
    memberId,
    ownerKey,
  });

  /* The certification may resolve after the draft was opened; see the model. */
  const resolved = resolveCertificationDraft(draft, certifications.lookup);
  const certification = resolved.certification;
  const errors = validateDraft(resolved, seats.choices);
  const invalid = hasDraftErrors(errors);
  const dirty =
    registration === null ||
    draftSignature(resolved) !==
      draftSignature(
        resolveCertificationDraft(initialDraft, certifications.lookup),
      );
  const showErrors = submitted;
  const currentSeatMissing =
    currentSeat !== null &&
    seats.choices.some(
      (choice) =>
        choice.number === currentSeat && choice.state === 'map-missing',
    );
  const certificationNames = [...certifications.lookup.byId.values()].sort(
    (left, right) => left.localeCompare(right, 'ko'),
  );

  const patch = (changes: Partial<PreRegistrationDraft>) =>
    setDraft((current) => ({ ...current, ...changes }));

  const addDrink = (name: string) => {
    const trimmed = name.trim();

    if (trimmed === '') {
      return;
    }

    setDraft((current) => ({
      ...current,
      drinks: [
        ...current.drinks,
        createDrinkDraft(
          trimmed,
          /* One note per drink name: a second 아아 inherits the first's note. */
          current.drinks.find((drink) => drink.name.trim() === trimmed)?.note ??
            '',
        ),
      ],
    }));
    setCustomDrink('');
  };

  const renameDrink = (id: number, name: string) =>
    setDraft((current) => ({
      ...current,
      drinks: current.drinks.map((drink) =>
        drink.id === id ? { ...drink, name } : drink,
      ),
    }));

  /* The note belongs to the drink name, so every row with that name shows it. */
  const annotateDrink = (id: number, note: string) =>
    setDraft((current) => {
      const key = current.drinks.find((drink) => drink.id === id)?.name.trim();

      return {
        ...current,
        drinks: current.drinks.map((drink) =>
          drink.id === id ||
          (key !== undefined && key !== '' && drink.name.trim() === key)
            ? { ...drink, note }
            : drink,
        ),
      };
    });

  const removeDrink = (id: number) =>
    setDraft((current) => ({
      ...current,
      drinks: current.drinks.filter((drink) => drink.id !== id),
    }));

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitted(true);

    if (saving || invalid || !dirty || !isCertificationResolved(resolved)) {
      return;
    }

    onSubmit(toPreRegistrationInput(resolved));
  };

  return (
    <form className="pre-registration-form" noValidate onSubmit={submit}>
      <p className="pre-registration-form__branch">
        <Building2 aria-hidden="true" size={15} />
        <span>{branchName}</span>
        <small>선택한 운영 지점에 등록돼요</small>
      </p>

      <Section index={1} title="기본 정보">
        <Field
          error={showErrors ? errors.name : undefined}
          label="이름"
          required
        >
          {(id) => (
            <input
              autoComplete="off"
              className="control"
              id={id}
              maxLength={PRE_REGISTRATION_NAME_MAX_LENGTH}
              onChange={(event) => patch({ name: event.target.value })}
              placeholder="회원가입 때 쓸 이름"
              ref={nameRef}
              type="text"
              value={draft.name}
            />
          )}
        </Field>

        <Field
          error={showErrors ? errors.expectedJoinDate : undefined}
          hint="비워 두면 미정으로 저장돼요."
          label="입사 예정일"
        >
          {(id) => (
            <input
              className="control"
              id={id}
              onChange={(event) =>
                patch({ expectedJoinDate: event.target.value })
              }
              type="date"
              value={draft.expectedJoinDate}
            />
          )}
        </Field>

        {certification.kind === 'text' ? (
          <Field
            error={showErrors ? errors.certification : undefined}
            hint={
              certifications.lookup.status === 'ready'
                ? '목록에 없는 이름을 입력하면 새 자격증으로 등록돼요.'
                : certifications.lookup.status === 'loading'
                  ? '자격증 목록을 불러오는 중이라 이름 제안이 아직 없어요.'
                  : '자격증 목록을 불러오지 못해 이름 제안이 없어요. 이름은 그대로 입력할 수 있어요.'
            }
            label="자격증"
          >
            {(id) => (
              <>
                <input
                  autoComplete="off"
                  className="control"
                  id={id}
                  list={datalistId}
                  maxLength={PRE_REGISTRATION_CERTIFICATION_MAX_LENGTH}
                  onChange={(event) =>
                    patch({
                      certification: {
                        kind: 'text',
                        value: event.target.value,
                      },
                    })
                  }
                  placeholder="준비하는 자격증 이름"
                  type="text"
                  value={certification.value}
                />
                <datalist id={datalistId}>
                  {certificationNames.map((name) => (
                    <option key={name} value={name} />
                  ))}
                </datalist>
              </>
            )}
          </Field>
        ) : (
          <UnresolvedCertification
            certificationId={certification.certificationId}
            onReplace={() =>
              patch({ certification: { kind: 'text', value: '' } })
            }
            onRetry={certifications.onRetry}
            status={certifications.lookup.status}
          />
        )}
      </Section>

      <Section index={2} title="좌석 배정">
        <Field
          error={showErrors ? errors.seatNumber : undefined}
          hint={
            currentSeatMissing
              ? `현재 좌석 ${currentSeat}번은 좌석 배치도에 없어요. 그대로 두거나 배치도에 있는 좌석으로 바꿀 수 있어요.`
              : '비어 있는 좌석만 고를 수 있어요. 미배정으로 두면 나중에 배정할 수 있어요.'
          }
          label="좌석"
        >
          {(id) => (
            <Select
              id={id}
              onChange={(event) =>
                patch({
                  seatNumber:
                    event.target.value === ''
                      ? null
                      : Number(event.target.value),
                })
              }
              value={draft.seatNumber ?? ''}
            >
              <option value="">미배정</option>
              {seats.choices.map((choice) => (
                <option
                  disabled={choice.state === 'taken'}
                  key={choice.number}
                  value={choice.number}
                >
                  {describeSeatChoice(choice)}
                </option>
              ))}
            </Select>
          )}
        </Field>

        {seats.errorMessage !== null ? (
          <p
            className="pre-registration-form__seat-state is-error"
            role="alert"
          >
            <span>
              {seats.errorMessage}{' '}
              {registration === null
                ? '좌석 없이 등록한 뒤 나중에 배정할 수 있어요.'
                : '현재 좌석은 그대로 둘 수 있어요.'}
            </span>
            <button onClick={seats.onRetry} type="button">
              다시 시도
            </button>
          </p>
        ) : (
          seats.loading &&
          !seats.ready && (
            <p className="pre-registration-form__seat-state" role="status">
              좌석 배치도와 사용 현황을 불러오는 중이에요.
            </p>
          )
        )}
      </Section>

      <Section index={3} title="음료">
        <p className="pre-registration-form__help">
          아침에 준비할 음료를 순서대로 적어요. 같은 음료를 두 번 넣으면 두
          잔이고, 메모는 음료 이름마다 하나예요.
        </p>

        {draft.drinks.length === 0 ? (
          <p className="pre-registration-form__empty">
            아직 음료가 없어요. 아래에서 골라 주세요.
          </p>
        ) : (
          <ol className="pre-registration-form__drinks">
            {draft.drinks.map((drink, index) => (
              <DrinkRow
                drink={drink}
                errors={showErrors ? errors.drinks[drink.id] : undefined}
                index={index}
                key={drink.id}
                onNote={(note) => annotateDrink(drink.id, note)}
                onRemove={() => removeDrink(drink.id)}
                onRename={(name) => renameDrink(drink.id, name)}
                saving={saving}
              />
            ))}
          </ol>
        )}

        <div className="pre-registration-form__picks">
          {DRINK_QUICK_PICKS.map((name) => (
            <button
              className="pre-registration-form__pick"
              key={name}
              onClick={() => addDrink(name)}
              type="button"
            >
              {name}
            </button>
          ))}
        </div>

        <div className="pre-registration-form__custom">
          <Input
            aria-label="직접 입력할 음료 이름"
            autoComplete="off"
            maxLength={BEVERAGE_NAME_MAX_LENGTH}
            onChange={(event) => setCustomDrink(event.target.value)}
            onKeyDown={(event) => {
              /* Enter here adds a drink; it must not submit the form. */
              if (event.key === 'Enter' && !event.nativeEvent.isComposing) {
                event.preventDefault();
                addDrink(customDrink);
              }
            }}
            placeholder="직접 입력"
            value={customDrink}
          />
          <Button
            disabled={customDrink.trim() === ''}
            onClick={() => addDrink(customDrink)}
            size="sm"
            variant="subtle"
          >
            <Plus aria-hidden="true" size={15} />
            추가
          </Button>
        </div>
      </Section>

      {/* Right above the buttons: where the eye is when 저장 is pressed. */}
      {errorMessage !== null ? (
        <p className="pre-registration-form__message" role="alert">
          {errorMessage}
        </p>
      ) : showErrors && invalid ? (
        <p className="pre-registration-form__message" role="alert">
          {registration === null
            ? '아직 등록할 수 없어요. 표시된 항목을 확인해 주세요.'
            : '아직 저장할 수 없어요. 표시된 항목을 확인해 주세요.'}
        </p>
      ) : (
        showErrors &&
        !dirty && (
          <p className="pre-registration-form__message is-quiet" role="status">
            바뀐 내용이 없어요.
          </p>
        )
      )}

      <div className="pre-registration-form__actions">
        <Button disabled={saving} onClick={onClose} variant="ghost">
          취소
        </Button>
        <Button loading={saving} type="submit">
          {registration === null ? '사전등록' : '저장'}
        </Button>
      </div>
    </form>
  );
}

function Section({
  children,
  index,
  title,
}: {
  children: ReactNode;
  index: number;
  title: string;
}) {
  return (
    <fieldset className="pre-registration-form__section">
      <legend className="pre-registration-form__legend">
        <b>{index}</b>
        {title}
      </legend>
      {children}
    </fieldset>
  );
}

/**
 * The record names a certification the list cannot name back. Nothing is
 * assumed: the operator sees the id, why it is unresolved, and chooses —
 * wait, retry, or replace it on purpose. Saving is refused until then.
 */
function UnresolvedCertification({
  certificationId,
  onReplace,
  onRetry,
  status,
}: {
  certificationId: number;
  onReplace: () => void;
  onRetry: () => void;
  status: CertificationLookup['status'];
}) {
  return (
    <div className="field">
      <span className="field__label">자격증</span>
      <div
        className="pre-registration-form__notice"
        role={status === 'loading' ? 'status' : 'alert'}
      >
        {status === 'loading' ? (
          <span>
            자격증 #{certificationId}의 이름을 확인하는 중이에요. 확인되면
            자동으로 채워져요.
          </span>
        ) : status === 'error' ? (
          <span>
            자격증 목록을 불러오지 못해 자격증 #{certificationId}의 이름을
            확인할 수 없어요. 이 상태로 저장하면 자격증이 지워지기 때문에 저장을
            막아 두었어요.
          </span>
        ) : (
          <span>
            자격증 #{certificationId}가 자격증 목록에 없어요. 이 사전등록을
            저장하려면 자격증을 다시 입력하거나 비워 두어야 해요.
          </span>
        )}
        {status !== 'loading' && (
          <span className="pre-registration-form__notice-actions">
            {status === 'error' && (
              <button onClick={onRetry} type="button">
                다시 시도
              </button>
            )}
            <button onClick={onReplace} type="button">
              자격증 직접 입력
            </button>
          </span>
        )}
      </div>
    </div>
  );
}

function DrinkRow({
  drink,
  errors,
  index,
  onNote,
  onRemove,
  onRename,
  saving,
}: {
  drink: DrinkDraft;
  errors: { name?: string; note?: string } | undefined;
  index: number;
  onNote: (note: string) => void;
  onRemove: () => void;
  onRename: (name: string) => void;
  saving: boolean;
}) {
  const message = errors?.name ?? errors?.note;

  return (
    <li
      className={cx(
        'pre-registration-form__drink',
        message !== undefined && 'is-invalid',
      )}
    >
      <span className="pre-registration-form__drink-index">{index + 1}</span>
      <Input
        aria-invalid={errors?.name !== undefined || undefined}
        aria-label={`${index + 1}번째 음료 이름`}
        autoComplete="off"
        maxLength={BEVERAGE_NAME_MAX_LENGTH}
        onChange={(event) => onRename(event.target.value)}
        placeholder="음료 이름"
        value={drink.name}
      />
      <Input
        aria-invalid={errors?.note !== undefined || undefined}
        aria-label={`${index + 1}번째 음료 메모`}
        autoComplete="off"
        maxLength={BEVERAGE_NOTE_MAX_LENGTH}
        onChange={(event) => onNote(event.target.value)}
        placeholder="메모 (연하게, 얼음 적게…)"
        value={drink.note}
      />
      <button
        aria-label={`${drink.name.trim() || '음료'} 삭제`}
        className="pre-registration-form__drink-remove"
        disabled={saving}
        onClick={onRemove}
        type="button"
      >
        <Trash2 aria-hidden="true" size={16} />
      </button>
      {message !== undefined && (
        <p className="pre-registration-form__drink-error" role="alert">
          {message}
        </p>
      )}
    </li>
  );
}
