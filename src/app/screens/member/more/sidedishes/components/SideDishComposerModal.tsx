import { useState } from 'react';
import { Info } from 'lucide-react';
import type { MealType } from '../../../../../features/side-dishes/side-dishes-api';
import { Button, Field, Input, Modal } from '../../../../../shared/ui';
import { formatWon } from '../model/sidedish.format';
import {
  MEAL_OPTIONS,
  SIDE_DISH_MAX_PRICE,
  SIDE_DISH_MENU_MAX_LENGTH,
} from '../model/sidedish.types';
import '../styles/SideDishComposerModal.css';

export function SideDishComposerModal({
  mealType,
  onClose,
  onSubmit,
  saving,
}: {
  mealType: MealType | null;
  onClose: () => void;
  onSubmit: (menuName: string, price: number) => void;
  saving: boolean;
}) {
  const meal = MEAL_OPTIONS.find((option) => option.value === mealType);

  return (
    <Modal
      onClose={onClose}
      open={mealType !== null}
      size="sm"
      title={meal ? `${meal.label} 반찬 신청` : '반찬 신청'}
    >
      {mealType !== null && (
        <ComposerBody
          key={mealType}
          onClose={onClose}
          onSubmit={onSubmit}
          saving={saving}
        />
      )}
    </Modal>
  );
}

function ComposerBody({
  onClose,
  onSubmit,
  saving,
}: {
  onClose: () => void;
  onSubmit: (menuName: string, price: number) => void;
  saving: boolean;
}) {
  const [menuName, setMenuName] = useState('');
  const [priceText, setPriceText] = useState('');

  const price = Number(priceText);
  const priceValid =
    priceText.trim().length > 0 &&
    Number.isInteger(price) &&
    price > 0 &&
    price <= SIDE_DISH_MAX_PRICE;
  const submittable = menuName.trim().length > 0 && priceValid;

  return (
    <form
      className="member-sidedishes__composer"
      onSubmit={(event) => {
        event.preventDefault();

        if (submittable) {
          onSubmit(menuName, price);
        }
      }}
    >
      <Field label="메뉴명" required>
        {(id) => (
          <Input
            id={id}
            maxLength={SIDE_DISH_MENU_MAX_LENGTH}
            onChange={(event) => setMenuName(event.target.value)}
            placeholder="예: 제육볶음"
            value={menuName}
          />
        )}
      </Field>

      <Field
        error={
          priceText.trim().length > 0 && !priceValid
            ? '1원 이상 100,000원 이하의 숫자를 입력해 주세요.'
            : undefined
        }
        hint={priceValid ? formatWon(price) : undefined}
        label="가격"
        required
      >
        {(id) => (
          <Input
            id={id}
            inputMode="numeric"
            onChange={(event) =>
              setPriceText(event.target.value.replace(/[^0-9]/g, ''))
            }
            placeholder="예: 5000"
            value={priceText}
          />
        )}
      </Field>

      <p className="member-sidedishes__composer-note">
        <Info aria-hidden="true" size={14} />
        <span>
          한 번에 한 개씩 신청돼요. 두 개가 필요하면 두 번 신청해 주세요.
        </span>
      </p>

      <div className="member-sidedishes__composer-actions">
        <Button onClick={onClose} variant="ghost">
          닫기
        </Button>
        <Button disabled={!submittable} loading={saving} type="submit">
          신청하기
        </Button>
      </div>
    </form>
  );
}
