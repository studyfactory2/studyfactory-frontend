import { Utensils } from 'lucide-react';
import type { SessionOwnerKey } from '../../../../core/session';
import { formatKoreanMonth } from '../../../../shared/lib/seoul-date';
import { Card, SectionError, SectionLoading } from '../../../../shared/ui';
import { SideDishComposerModal } from '../../../member/more/sidedishes/components/SideDishComposerModal';
import { SideDishCancelModal } from '../../../member/more/sidedishes/components/SideDishCancelModal';
import { SideDishRestaurantNotice } from '../../../member/more/sidedishes/components/SideDishRestaurantNotice';
import { SideDishDateBar } from '../../../member/more/sidedishes/components/SideDishDateBar';
import { SideDishMealSection } from '../../../member/more/sidedishes/components/SideDishMealSection';
import { SideDishMonthPanel } from '../../../member/more/sidedishes/components/SideDishMonthPanel';
import { useMemberSideDishes } from '../../../member/more/sidedishes/hooks/useMemberSideDishes';

export function StaffSideDishPanel({
  memberId,
  ownerKey,
}: {
  memberId: number;
  ownerKey: SessionOwnerKey;
}) {
  const sideDishes = useMemberSideDishes(memberId, ownerKey);
  const [year, month] = sideDishes.selectedDateKey.split('-').map(Number);

  return (
    <div className="staff-operations__request-view">
      <header className="staff-operations__request-heading">
        <span aria-hidden="true">
          <Utensils size={20} />
        </span>
        <div>
          <h3>내 반찬</h3>
          <p>점심은 10:45, 저녁은 16:30까지 신청할 수 있어요 · 서울 기준</p>
        </div>
      </header>

      <SideDishRestaurantNotice />

      <div className="staff-operations__request-grid is-meals">
        <Card className="staff-operations__request-card">
          <SideDishDateBar
            hasOrders={sideDishes.orderDates.values.has(
              sideDishes.selectedDateKey,
            )}
            isToday={sideDishes.isToday}
            onGoToday={sideDishes.onGoToday}
            onShiftDate={sideDishes.onShiftDate}
            selectedDateKey={sideDishes.selectedDateKey}
          />

          {sideDishes.orders.loading ? (
            <SectionLoading label="반찬 신청 내역을 불러오는 중이에요." />
          ) : sideDishes.orders.errorMessage ? (
            <SectionError
              message={sideDishes.orders.errorMessage}
              onRetry={sideDishes.orders.onRetry}
            />
          ) : (
            <div className="staff-operations__meal-grid">
              {sideDishes.meals.map(({ meal, orders, status }) => (
                <SideDishMealSection
                  key={meal.value}
                  meal={meal}
                  onDelete={sideDishes.onDelete}
                  onOpenComposer={sideDishes.onOpenComposer}
                  orders={orders}
                  saving={sideDishes.saving}
                  status={status}
                />
              ))}
            </div>
          )}
        </Card>

        <SideDishMonthPanel
          monthLabel={formatKoreanMonth(year, month)}
          orderDates={sideDishes.orderDates}
          onSelectDate={sideDishes.onSelectDate}
          selectedDateKey={sideDishes.selectedDateKey}
        />
      </div>

      <SideDishComposerModal
        mealDate={sideDishes.composingDate}
        mealType={sideDishes.composingMeal}
        onClose={sideDishes.onCloseComposer}
        onSubmit={sideDishes.onSubmit}
        saving={sideDishes.saving}
        orderingOpen={sideDishes.orderingOpen}
        errorMessage={sideDishes.createError}
        submissionUncertain={sideDishes.submissionUncertain}
      />
      <SideDishCancelModal
        {...sideDishes.cancellation}
        saving={sideDishes.saving}
      />
    </div>
  );
}
