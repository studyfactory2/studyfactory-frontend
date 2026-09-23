import { useEffect, useRef, useState } from 'react';
import { Check, Info, Plus, Trash2 } from 'lucide-react';
import type { MealType } from '../../../../../features/side-dishes/side-dishes-api';
import { formatKoreanDate } from '../../../../../shared/lib/seoul-date';
import { Button, Field, Input, Modal } from '../../../../../shared/ui';
import { formatWon } from '../model/sidedish.format';
import {
  getSideDishOrderTotal,
  SIDE_DISH_PAYMENT,
  type SideDishOrderItem,
  validateSideDishItems,
} from '../model/sidedish-order';
import {
  MEAL_OPTIONS,
  SIDE_DISH_MAX_PRICE,
  SIDE_DISH_MENU_MAX_LENGTH,
} from '../model/sidedish.types';
import '../styles/SideDishComposerModal.css';

type ComposerProps = {
  mealDate: string | null;
  mealType: MealType | null;
  onClose: () => void;
  onSubmit: (items: SideDishOrderItem[], transferDeclared: boolean) => void;
  saving: boolean;
  orderingOpen: boolean;
  errorMessage: string | null;
  submissionUncertain: boolean;
};

type ItemDraft = { id: number; menuName: string; priceText: string };

export function SideDishComposerModal({
  mealDate,
  mealType,
  onClose,
  onSubmit,
  saving,
  orderingOpen,
  errorMessage,
  submissionUncertain,
}: ComposerProps) {
  const meal = MEAL_OPTIONS.find((option) => option.value === mealType);
  const title =
    meal && mealDate
      ? `${formatKoreanDate(mealDate)} ${meal.label} 반찬 신청`
      : '반찬 신청';

  return (
    <Modal
      closeDisabled={saving}
      onClose={onClose}
      open={mealType !== null && mealDate !== null}
      panelClassName="member-sidedishes__composer-modal"
      size="md"
      title={title}
    >
      {mealType !== null && mealDate !== null && (
        <ComposerBody
          errorMessage={errorMessage}
          key={`${mealDate}:${mealType}`}
          onClose={onClose}
          onSubmit={onSubmit}
          orderingOpen={orderingOpen}
          saving={saving}
          submissionUncertain={submissionUncertain}
        />
      )}
    </Modal>
  );
}

function ComposerBody({
  onClose,
  onSubmit,
  saving,
  orderingOpen,
  errorMessage,
  submissionUncertain,
}: Omit<ComposerProps, 'mealDate' | 'mealType'>) {
  const [drafts, setDrafts] = useState<ItemDraft[]>([
    { id: 0, menuName: '', priceText: '' },
  ]);
  const nextDraftId = useRef(1);
  const [reviewItems, setReviewItems] = useState<SideDishOrderItem[] | null>(
    null,
  );
  const [transferDeclared, setTransferDeclared] = useState(false);
  const [validationMessage, setValidationMessage] = useState<string | null>(
    null,
  );
  const reviewTitleRef = useRef<HTMLHeadingElement>(null);
  const editingTitleRef = useRef<HTMLHeadingElement>(null);
  const isReview = reviewItems !== null;
  const interactionDisabled = saving || submissionUncertain;

  useEffect(() => {
    if (isReview) {
      reviewTitleRef.current?.focus();
    }
  }, [isReview]);

  function updateDraft(id: number, patch: Partial<Omit<ItemDraft, 'id'>>) {
    setValidationMessage(null);
    setDrafts((current) =>
      current.map((draft) =>
        draft.id === id ? { ...draft, ...patch } : draft,
      ),
    );
  }

  function startReview() {
    if (!orderingOpen || interactionDisabled) return;

    const items = drafts.map((draft) => ({
      menuName: draft.menuName.trim(),
      price: Number(draft.priceText),
    }));
    const error = validateSideDishItems(items);

    if (error) {
      setValidationMessage(error);
      return;
    }

    setValidationMessage(null);
    setTransferDeclared(false);
    setReviewItems(items);
  }

  function submitReview() {
    if (
      reviewItems === null ||
      !transferDeclared ||
      !orderingOpen ||
      interactionDisabled
    ) {
      return;
    }

    const error = validateSideDishItems(reviewItems);
    if (error) {
      setValidationMessage(error);
      return;
    }

    onSubmit(
      reviewItems.map((item) => ({ ...item })),
      transferDeclared,
    );
  }

  return (
    <form
      className="member-sidedishes__composer"
      onSubmit={(event) => {
        event.preventDefault();
        if (isReview) submitReview();
        else startReview();
      }}
    >
      <ol
        aria-label="반찬 신청 단계"
        className="member-sidedishes__composer-steps"
      >
        <li aria-current={!isReview ? 'step' : undefined}>
          <span>{isReview ? <Check aria-hidden="true" size={13} /> : '1'}</span>
          메뉴 입력
        </li>
        <li aria-current={isReview ? 'step' : undefined}>
          <span>2</span>
          확인 후 신청
        </li>
      </ol>

      {!orderingOpen && (
        <p className="member-sidedishes__composer-alert" role="status">
          신청 시간이 마감되어 더 이상 신청할 수 없어요.
        </p>
      )}

      {submissionUncertain && (
        <p className="member-sidedishes__composer-alert" role="alert">
          신청 결과를 확인하지 못했어요. 중복 신청을 막기 위해 이 창에서 다시
          신청할 수 없어요. 창을 닫고 기존 신청 내역을 먼저 확인해 주세요.
        </p>
      )}

      {reviewItems === null ? (
        <>
          <div className="member-sidedishes__composer-lead">
            <h4 ref={editingTitleRef} tabIndex={-1}>
              주문할 메뉴를 입력해 주세요.
            </h4>
            <p>여러 메뉴를 한 번에 확인하고 신청할 수 있어요.</p>
          </div>

          <div className="member-sidedishes__composer-drafts">
            {drafts.map((draft, index) => {
              const price = Number(draft.priceText);
              const priceValid =
                draft.priceText.length > 0 &&
                Number.isInteger(price) &&
                price > 0 &&
                price <= SIDE_DISH_MAX_PRICE;

              return (
                <fieldset
                  className="member-sidedishes__composer-item"
                  disabled={interactionDisabled}
                  key={draft.id}
                >
                  <legend>메뉴 {index + 1}</legend>
                  <div className="member-sidedishes__composer-item-fields">
                    <Field label={`메뉴 ${index + 1} 이름`} required>
                      {(id) => (
                        <Input
                          disabled={interactionDisabled}
                          id={id}
                          maxLength={SIDE_DISH_MENU_MAX_LENGTH}
                          onChange={(event) =>
                            updateDraft(draft.id, {
                              menuName: event.target.value,
                            })
                          }
                          placeholder="예: 제육볶음"
                          value={draft.menuName}
                        />
                      )}
                    </Field>

                    <Field
                      error={
                        draft.priceText.length > 0 && !priceValid
                          ? '1원 이상 100,000원 이하로 입력해 주세요.'
                          : undefined
                      }
                      hint={priceValid ? formatWon(price) : undefined}
                      label={`메뉴 ${index + 1} 가격`}
                      required
                    >
                      {(id) => (
                        <Input
                          disabled={interactionDisabled}
                          id={id}
                          inputMode="numeric"
                          maxLength={7}
                          onChange={(event) =>
                            updateDraft(draft.id, {
                              priceText: event.target.value.replace(
                                /[^0-9]/g,
                                '',
                              ),
                            })
                          }
                          placeholder="예: 5000"
                          value={draft.priceText}
                        />
                      )}
                    </Field>
                  </div>
                  {drafts.length > 1 && (
                    <Button
                      aria-label={`메뉴 ${index + 1} 삭제`}
                      disabled={interactionDisabled}
                      onClick={() => {
                        setDrafts((current) =>
                          current.filter((item) => item.id !== draft.id),
                        );
                        setValidationMessage(null);
                      }}
                      size="sm"
                      variant="ghost"
                    >
                      <Trash2 aria-hidden="true" size={14} />
                      삭제
                    </Button>
                  )}
                </fieldset>
              );
            })}
          </div>

          <Button
            className="member-sidedishes__composer-add"
            disabled={interactionDisabled}
            onClick={() => {
              const id = nextDraftId.current++;
              setDrafts((current) => [
                ...current,
                { id, menuName: '', priceText: '' },
              ]);
              setValidationMessage(null);
            }}
            variant="subtle"
          >
            <Plus aria-hidden="true" size={15} />
            메뉴 추가
          </Button>
        </>
      ) : (
        <>
          <section className="member-sidedishes__composer-section">
            <h4 ref={reviewTitleRef} tabIndex={-1}>
              1. 주문 내용 확인
            </h4>
            <ul className="member-sidedishes__composer-summary">
              {reviewItems.map((item, index) => (
                <li key={index}>
                  <span>
                    <small>{index + 1}.</small> {item.menuName}
                  </span>
                  <strong>{formatWon(item.price)}</strong>
                </li>
              ))}
            </ul>
            <p className="member-sidedishes__composer-total">
              <span>총 {reviewItems.length}개 메뉴</span>
              <strong>{formatWon(getSideDishOrderTotal(reviewItems))}</strong>
            </p>
          </section>

          <section className="member-sidedishes__composer-section">
            <h4>2. 계좌이체</h4>
            <p className="member-sidedishes__composer-payment-lead">
              아래 카카오페이 또는 계좌로 총 금액을 송금해 주세요.
            </p>
            <dl className="member-sidedishes__composer-payment">
              <div>
                <dt>카카오페이</dt>
                <dd>{SIDE_DISH_PAYMENT.kakaoPayLabel}</dd>
              </div>
              <div>
                <dt>계좌이체</dt>
                <dd>
                  {SIDE_DISH_PAYMENT.bankName}{' '}
                  <span>{SIDE_DISH_PAYMENT.accountNumber}</span>
                  <span>{SIDE_DISH_PAYMENT.recipient}</span>
                </dd>
              </div>
            </dl>
            <label className="member-sidedishes__composer-transfer">
              <input
                checked={transferDeclared}
                disabled={interactionDisabled || !orderingOpen}
                onChange={(event) => setTransferDeclared(event.target.checked)}
                type="checkbox"
              />
              <span>송금완료</span>
            </label>
            <p className="member-sidedishes__composer-note">
              <Info aria-hidden="true" size={14} />
              <span>송금 여부는 자동으로 확인되지 않아요.</span>
            </p>
          </section>

          <section className="member-sidedishes__composer-section member-sidedishes__composer-final">
            <h4>3. 신청하기</h4>
            <p>
              주문 내용과 송금을 확인한 후 아래 신청하기 버튼을 눌러야 신청이
              완료돼요.
            </p>
          </section>
        </>
      )}

      {(validationMessage || errorMessage) && (
        <p className="member-sidedishes__composer-alert" role="alert">
          {validationMessage || errorMessage}
        </p>
      )}

      <div className="member-sidedishes__composer-actions">
        {isReview && !submissionUncertain ? (
          <Button
            disabled={saving}
            onClick={() => {
              setReviewItems(null);
              setTransferDeclared(false);
              setValidationMessage(null);
              requestAnimationFrame(() => editingTitleRef.current?.focus());
            }}
            variant="ghost"
          >
            메뉴 수정
          </Button>
        ) : (
          <Button disabled={saving} onClick={onClose} variant="ghost">
            {submissionUncertain ? '신청 내역 확인' : '닫기'}
          </Button>
        )}
        <Button
          disabled={
            !orderingOpen ||
            submissionUncertain ||
            (isReview && !transferDeclared)
          }
          loading={saving}
          type="submit"
        >
          {isReview ? '신청하기' : '주문 내용 확인'}
        </Button>
      </div>
    </form>
  );
}
