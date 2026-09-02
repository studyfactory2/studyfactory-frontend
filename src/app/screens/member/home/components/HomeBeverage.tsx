import { CupSoda } from 'lucide-react';
import type { BeverageItemResponse } from '../../../../features/beverages/beverages-api';
import {
  HomeSectionEmpty,
  HomeSectionError,
  HomeSectionLoading,
} from './HomeSectionState';
import '../styles/HomeAside.css';

export type HomeBeverageProps = {
  errorMessage: string | null;
  items: BeverageItemResponse[];
  loading: boolean;
  onRetry: () => void;
};

export function HomeBeverage({
  errorMessage,
  items,
  loading,
  onRetry,
}: HomeBeverageProps) {
  return (
    <section
      aria-labelledby="member-home-beverage-title"
      className="member-home__card member-home__aside-card"
    >
      <header className="member-home__card-header">
        <span className="member-home__card-icon">
          <CupSoda aria-hidden="true" size={18} />
        </span>
        <h3 id="member-home-beverage-title">등록한 음료</h3>
      </header>

      {loading ? (
        <HomeSectionLoading label="음료 정보를 불러오는 중이에요." />
      ) : errorMessage !== null ? (
        <HomeSectionError message={errorMessage} onRetry={onRetry} />
      ) : items.length === 0 ? (
        <HomeSectionEmpty title="등록된 음료가 없어요.">
          <span>스탭에게 마시고 싶은 음료를 알려 주세요.</span>
        </HomeSectionEmpty>
      ) : (
        <ul className="member-home__beverage-list">
          {items.map((item, itemIndex) => (
            <li key={item.id ?? `${item.name}-${itemIndex}`}>
              <strong>{item.name}</strong>
              {item.note?.trim() && <span>{item.note}</span>}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
