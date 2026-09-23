import { ExternalLink } from 'lucide-react';
import { SIDE_DISH_RESTAURANT } from '../model/sidedish-order';
import { formatWon } from '../model/sidedish.format';
import '../styles/SideDishOrderNotices.css';

export function SideDishRestaurantNotice() {
  return (
    <aside
      aria-label="반찬 주문 안내"
      className="member-sidedishes__restaurant"
    >
      <div>
        <span>현재 주문 중인 반찬집</span>
        <strong>{SIDE_DISH_RESTAURANT.name}</strong>
      </div>
      <a
        href={SIDE_DISH_RESTAURANT.url}
        rel="noopener noreferrer"
        target="_blank"
      >
        쿠팡이츠 바로가기 <ExternalLink aria-hidden="true" size={15} />
        <span className="member-sidedishes__visually-hidden">(새 창)</span>
      </a>
      <p>
        마감시간까지 최소 주문금액{' '}
        {formatWon(SIDE_DISH_RESTAURANT.minimumOrderAmount)}에 미달하면 주문이
        취소될 수 있어요. 취소 시 운영자가 개별 안내해 드려요.
      </p>
    </aside>
  );
}
