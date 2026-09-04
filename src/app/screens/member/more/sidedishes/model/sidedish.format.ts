import type { SideDishResponse } from '../../../../../features/side-dishes/side-dishes-api';

const priceFormatter = new Intl.NumberFormat('ko-KR');

/**
 * Orders are stored as one string, "메뉴명: 가격", built by the backend from
 * the menu name and the price. Only the part before the first colon is the
 * name; the authoritative price is the numeric totalPrice field.
 */
export function getSideDishMenuName(order: SideDishResponse) {
  const [name] = order.items.split(':');
  const trimmed = (name ?? '').trim();

  return trimmed.length > 0 ? trimmed : order.items.trim();
}

export function formatWon(price: number) {
  return `${priceFormatter.format(price)}원`;
}
