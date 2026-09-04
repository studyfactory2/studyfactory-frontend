import { Plus } from 'lucide-react';
import type { SideDishResponse } from '../../../../../features/side-dishes/side-dishes-api';
import { Badge, Button } from '../../../../../shared/ui';
import { formatWon, getSideDishMenuName } from '../model/sidedish.format';
import type { MealOption, MealStatus } from '../model/sidedish.types';
import '../styles/SideDishMealSection.css';

const STATUS_LABEL: Record<MealStatus, string> = {
  closed: '마감',
  open: '신청 가능',
  past: '지난 날짜',
};

export function SideDishMealSection({
  meal,
  onDelete,
  onOpenComposer,
  orders,
  saving,
  status,
}: {
  meal: MealOption;
  onDelete: (sideDishId: number) => void;
  onOpenComposer: (mealType: MealOption['value']) => void;
  orders: readonly SideDishResponse[];
  saving: boolean;
  status: MealStatus;
}) {
  return (
    <section
      aria-label={`${meal.label} 반찬`}
      className="member-sidedishes__meal"
    >
      <header>
        <h3>{meal.label}</h3>
        <Badge tone={status === 'open' ? 'positive' : 'neutral'}>
          {STATUS_LABEL[status]}
        </Badge>
        <span>{meal.deadlineLabel}까지</span>
      </header>

      {orders.length === 0 ? (
        <p className="member-sidedishes__meal-empty">신청한 반찬이 없어요.</p>
      ) : (
        <ul className="member-sidedishes__meal-orders">
          {orders.map((order) => (
            <li key={order.id}>
              <span className="member-sidedishes__meal-order">
                <strong>{getSideDishMenuName(order)}</strong>
                <em>{formatWon(order.totalPrice)}</em>
              </span>
              {status === 'open' && (
                <Button
                  loading={saving}
                  onClick={() => onDelete(order.id)}
                  size="sm"
                  variant="ghost"
                >
                  취소
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}

      {status === 'open' && (
        <Button
          className="member-sidedishes__meal-add"
          full
          onClick={() => onOpenComposer(meal.value)}
          variant="subtle"
        >
          <Plus aria-hidden="true" size={16} />
          {meal.label} 반찬 신청
        </Button>
      )}
    </section>
  );
}
