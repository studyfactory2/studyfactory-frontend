import type { SideDishResponse } from '../../../../../features/side-dishes/side-dishes-api';

const priceFormatter = new Intl.NumberFormat('ko-KR');

/**
 * Legacy baskets store one "메뉴명: 가격" entry per line. Keep every dish
 * visible; the authoritative order total is the numeric totalPrice field.
 */
export function getSideDishMenuName(order: SideDishResponse) {
  return order.items
    .split(/\r?\n/)
    .map((line) => line.replace(/:\s*\d[\d,]*\s*원?\s*$/, '').trim())
    .filter(Boolean)
    .join(' · ');
}

export function formatWon(price: number) {
  return `${priceFormatter.format(price)}원`;
}
