import { ChevronRight, CupSoda } from 'lucide-react';
import type { BeverageItemResponse } from '../../../../../features/beverages/beverages-api';
import '../styles/BeverageList.css';

export function BeverageList({
  items,
  onSelect,
}: {
  items: readonly BeverageItemResponse[];
  onSelect: (index: number) => void;
}) {
  return (
    <ol className="member-beverages__list">
      {items.map((item, index) => (
        <li key={item.id ?? `${item.name}-${index}`}>
          <button
            className="member-beverages__row"
            onClick={() => onSelect(index)}
            type="button"
          >
            <span aria-hidden="true" className="member-beverages__row-icon">
              <CupSoda size={18} />
            </span>
            <span className="member-beverages__row-copy">
              <strong>{item.name}</strong>
              {item.note !== null && item.note.trim().length > 0 && (
                <small>{item.note}</small>
              )}
            </span>
            <ChevronRight
              aria-hidden="true"
              className="member-beverages__row-arrow"
              size={18}
            />
          </button>
        </li>
      ))}
    </ol>
  );
}
