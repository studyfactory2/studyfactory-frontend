import { Field, Select, Textarea } from '../../../../shared/ui';
import type { SeatOptionsState } from '../hooks/useSeatOptions';
import type { CertificationLookup } from '../model/admin-members';
import type {
  CurrentMemberDraft,
  CurrentMemberDraftErrors,
} from '../model/current-member-form';
import { describeSeatChoice } from '../model/member-seat-options';

type CurrentMemberLearningFieldsProps = {
  certifications: { lookup: CertificationLookup; onRetry: () => void };
  currentSeat: number | null;
  currentSeatMissing: boolean;
  draft: CurrentMemberDraft;
  errors: CurrentMemberDraftErrors;
  onPatch: (changes: Partial<CurrentMemberDraft>) => void;
  saving: boolean;
  seats: SeatOptionsState;
  showErrors: boolean;
  unresolvedCertification: number | null;
};

export function CurrentMemberLearningFields({
  certifications,
  currentSeat,
  currentSeatMissing,
  draft,
  errors,
  onPatch,
  saving,
  seats,
  showErrors,
  unresolvedCertification,
}: CurrentMemberLearningFieldsProps) {
  const certificationsByName = [...certifications.lookup.byId.entries()].sort(
    ([, left], [, right]) => left.localeCompare(right, 'ko'),
  );

  return (
    <>
      <div className="current-member-form__grid">
        <Field
          error={showErrors ? errors.seatNumber : undefined}
          hint={
            currentSeatMissing
              ? `현재 ${currentSeat}번 좌석은 배치도에 없어요. 그대로 두거나 다른 좌석으로 바꿀 수 있어요.`
              : '선택한 지점의 비어 있는 좌석만 보여요.'
          }
          label="좌석"
        >
          {(id) => (
            <Select
              disabled={saving}
              id={id}
              onChange={(event) =>
                onPatch({
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

        <Field
          error={showErrors ? errors.certificationId : undefined}
          hint="현재 등록된 자격증 목록에서 선택해요."
          label="주 자격증"
        >
          {(id) => (
            <Select
              disabled={saving}
              id={id}
              onChange={(event) =>
                onPatch({
                  certificationId:
                    event.target.value === ''
                      ? null
                      : Number(event.target.value),
                })
              }
              value={draft.certificationId ?? ''}
            >
              <option value="">없음</option>
              {unresolvedCertification !== null && (
                <option value={unresolvedCertification}>
                  자격증 #{unresolvedCertification} (현재)
                </option>
              )}
              {certificationsByName.map(([id, name]) => (
                <option key={id} value={id}>
                  {name}
                </option>
              ))}
            </Select>
          )}
        </Field>

        <div className="current-member-form__wide">
          <Field
            hint="한 줄에 하나씩 입력해요. 비워 두면 준비 중인 자격증이 없는 것으로 저장돼요."
            label="준비 중인 자격증"
          >
            {(id) => (
              <Textarea
                disabled={saving}
                id={id}
                onChange={(event) =>
                  onPatch({ preparingCertifications: event.target.value })
                }
                placeholder={'공인중개사\n주택관리사'}
                rows={3}
                value={draft.preparingCertifications}
              />
            )}
          </Field>
        </div>
      </div>

      {seats.errorMessage !== null ? (
        <p className="current-member-form__option-state is-error" role="alert">
          <span>{seats.errorMessage}</span>
          <button onClick={seats.onRetry} type="button">
            다시 시도
          </button>
        </p>
      ) : (
        seats.loading &&
        !seats.ready && (
          <p className="current-member-form__option-state" role="status">
            선택한 지점의 좌석과 이름 사용 현황을 확인하는 중이에요.
          </p>
        )
      )}

      {certifications.lookup.status === 'error' && (
        <p
          className="current-member-form__option-state is-warning"
          role="alert"
        >
          <span>
            자격증 목록을 불러오지 못했어요. 기존 선택은 그대로 보존돼요.
          </span>
          <button onClick={certifications.onRetry} type="button">
            다시 시도
          </button>
        </p>
      )}
    </>
  );
}
