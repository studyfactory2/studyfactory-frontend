import type { DailySideDishResponse } from '../../side-dishes/side-dishes-api';
import {
  formatAttendanceWon,
  type AttendanceMealGroup,
} from '../model/manager-operations';
import { parseManagerSideDishItems } from '../model/manager-side-dishes';

export function ManagerSideDishOrders({
  lunch,
  dinner,
}: {
  lunch: AttendanceMealGroup;
  dinner: AttendanceMealGroup;
}) {
  return (
    <div className="manager-side-dish-orders">
      <MealOrders group={lunch} label="점심" />
      <MealOrders group={dinner} label="저녁" />
    </div>
  );
}

function MealOrders({
  group,
  label,
}: {
  group: AttendanceMealGroup;
  label: string;
}) {
  return (
    <section
      aria-label={`${label} 반찬 신청`}
      className="manager-side-dish-meal"
    >
      <header className="manager-side-dish-meal__header">
        <h3>{label} 반찬 신청</h3>
        <span>{group.orders.length}건</span>
      </header>
      {group.orders.length === 0 ? (
        <p className="manager-side-dish-meal__empty">신청 없음</p>
      ) : (
        <ul className="manager-side-dish-meal__orders">
          {group.orders.map((order) => (
            <li className="manager-side-dish-order" key={order.id}>
              <OrderDetails order={order} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function OrderDetails({ order }: { order: DailySideDishResponse }) {
  const items = parseManagerSideDishItems(order.items);

  return (
    <>
      <h4 className="manager-side-dish-order__member">
        <span>
          {order.seatNumber === null ? '미배정' : `${order.seatNumber}번`}
        </span>
        <strong>{order.memberName}</strong>
      </h4>
      {items.length === 0 ? (
        <p className="manager-side-dish-order__notice">
          상세 메뉴 정보가 없어요. 주문 내용을 확인해 주세요.
        </p>
      ) : (
        <ol className="manager-side-dish-order__items">
          {items.map((item, index) => (
            <li key={`${order.id}-${index}`}>
              <span>{item.label}</span>
              {item.price === null ? (
                <small className="manager-side-dish-order__notice">
                  가격 확인 필요
                </small>
              ) : (
                <b>{formatAttendanceWon(item.price)}</b>
              )}
            </li>
          ))}
        </ol>
      )}
      <p className="manager-side-dish-order__total">
        <span>주문 합계</span>
        <strong>{formatAttendanceWon(order.totalPrice)}</strong>
      </p>
    </>
  );
}
