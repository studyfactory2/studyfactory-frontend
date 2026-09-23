import {
  SIDE_DISH_MAX_PRICE,
  SIDE_DISH_MENU_MAX_LENGTH,
} from './sidedish.types';

export type SideDishOrderItem = {
  menuName: string;
  price: number;
};

/* Confirmed by the operator. These are instructions, not a payment integration. */
export const SIDE_DISH_RESTAURANT = {
  name: '손찬반찬백화점 센텀점',
  url: 'https://web.coupangeats.com/share?storeId=636864&dishId&key=1a0b507c-5a97-4edd-99d6-013a8ba73162',
  minimumOrderAmount: 15_000,
} as const;

export const SIDE_DISH_PAYMENT = {
  bankName: '신한은행',
  accountNumber: '110-498-435650',
  recipient: '김지원',
  kakaoPayLabel: '사장님 카카오페이',
} as const;

export function getSideDishOrderTotal(items: readonly SideDishOrderItem[]) {
  return items.reduce((total, item) => total + item.price, 0);
}

export function validateSideDishItems(items: readonly SideDishOrderItem[]) {
  if (items.length === 0) {
    return '반찬을 한 개 이상 입력해 주세요.';
  }

  for (const item of items) {
    if (
      !item.menuName.trim() ||
      item.menuName.trim().length > SIDE_DISH_MENU_MAX_LENGTH
    ) {
      return `메뉴명은 1–${SIDE_DISH_MENU_MAX_LENGTH}자로 입력해 주세요.`;
    }
    if (/[:\r\n]/.test(item.menuName)) {
      return '메뉴명에는 줄바꿈이나 : 기호를 사용할 수 없어요.';
    }
    if (
      !Number.isInteger(item.price) ||
      item.price <= 0 ||
      item.price > SIDE_DISH_MAX_PRICE
    ) {
      return '각 반찬 가격은 1원 이상 100,000원 이하로 입력해 주세요.';
    }
  }

  const total = getSideDishOrderTotal(items);
  return Number.isSafeInteger(total) && total <= 2_147_483_647
    ? null
    : '주문 합계가 너무 커요. 금액을 다시 확인해 주세요.';
}

/** Keep the old app's one-basket/one-record format and cancellation unit. */
export function serializeSideDishItems(items: readonly SideDishOrderItem[]) {
  return items
    .map((item) => `${item.menuName.trim()}: ${item.price}`)
    .join('\n');
}
