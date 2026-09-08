import { memberRoutes } from '../../../../core/router/routes';
import { formatKoreanMonth } from '../../../../shared/lib/seoul-date';
import { useSession, type SessionOwnerKey } from '../../../../core/session';
import {
  ScreenHeader,
  SectionError,
  SectionLoading,
} from '../../../../shared/ui';
import { SideDishComposerModal } from './components/SideDishComposerModal';
import { SideDishMonthPanel } from './components/SideDishMonthPanel';
import { SideDishDateBar } from './components/SideDishDateBar';
import { SideDishMealSection } from './components/SideDishMealSection';
import { useMemberSideDishes } from './hooks/useMemberSideDishes';
import './styles/MemberSideDishesScreen.css';

export function MemberSideDishesScreen() {
  const { memberId, ownerKey } = useSession();

  if (memberId === null || ownerKey === null) {
    return null;
  }

  return (
    <MemberSideDishes
      key={ownerKey}
      memberId={memberId}
      queryOwnerKey={ownerKey}
    />
  );
}

function MemberSideDishes({
  memberId,
  queryOwnerKey,
}: {
  memberId: number;
  queryOwnerKey: SessionOwnerKey;
}) {
  const sideDishes = useMemberSideDishes(memberId, queryOwnerKey);
  const { orders } = sideDishes;

  return (
    <section className="member-sidedishes">
      <ScreenHeader
        backTo={memberRoutes.more}
        eyebrow="MEMBER · SIDE DISH"
        subtitle="점심은 10:45, 저녁은 16:30까지 신청할 수 있어요 · 서울 기준"
        title="반찬"
      />

      {/* The day on the left, the month on the right — the order-dates call
       * that already draws the date-bar dot pays for the whole rail. */}
      <div className="member-sidedishes__split">
        <div className="member-sidedishes__card">
          <SideDishDateBar
            hasOrders={sideDishes.orderDates.values.has(
              sideDishes.selectedDateKey,
            )}
            isToday={sideDishes.isToday}
            onGoToday={sideDishes.onGoToday}
            onShiftDate={sideDishes.onShiftDate}
            selectedDateKey={sideDishes.selectedDateKey}
          />

          {orders.loading ? (
            <SectionLoading label="반찬 신청 내역을 불러오는 중이에요." />
          ) : orders.errorMessage !== null ? (
            <SectionError
              message={orders.errorMessage}
              onRetry={orders.onRetry}
            />
          ) : (
            <div className="member-sidedishes__meals">
              {sideDishes.meals.map(({ meal, orders: mealOrders, status }) => (
                <SideDishMealSection
                  key={meal.value}
                  meal={meal}
                  onDelete={sideDishes.onDelete}
                  onOpenComposer={sideDishes.onOpenComposer}
                  orders={mealOrders}
                  saving={sideDishes.saving}
                  status={status}
                />
              ))}
            </div>
          )}
        </div>

        <SideDishMonthPanel
          monthLabel={formatKoreanMonth(
            Number(sideDishes.selectedDateKey.slice(0, 4)),
            Number(sideDishes.selectedDateKey.slice(5, 7)),
          )}
          orderDates={sideDishes.orderDates}
          onSelectDate={sideDishes.onSelectDate}
          selectedDateKey={sideDishes.selectedDateKey}
        />
      </div>

      <SideDishComposerModal
        mealType={sideDishes.composingMeal}
        onClose={sideDishes.onCloseComposer}
        onSubmit={sideDishes.onSubmit}
        saving={sideDishes.saving}
      />
    </section>
  );
}
