import { ChevronLeft, ChevronRight } from 'lucide-react';
import { formatKoreanDate } from '../../../../../shared/lib/seoul-date';
import '../styles/SideDishDateBar.css';

export function SideDishDateBar({
  hasOrders,
  isToday,
  onGoToday,
  onShiftDate,
  selectedDateKey,
}: {
  hasOrders: boolean;
  isToday: boolean;
  onGoToday: () => void;
  onShiftDate: (days: number) => void;
  selectedDateKey: string;
}) {
  return (
    <div className="member-sidedishes__datebar">
      <button
        aria-label="이전 날짜"
        className="member-sidedishes__datebar-step"
        onClick={() => onShiftDate(-1)}
        type="button"
      >
        <ChevronLeft aria-hidden="true" size={18} />
      </button>

      <strong aria-live="polite" className="member-sidedishes__datebar-date">
        {formatKoreanDate(selectedDateKey)}
        {isToday && <small>오늘</small>}
        {hasOrders && (
          <i
            aria-label="신청한 반찬이 있는 날"
            className="member-sidedishes__datebar-dot"
          />
        )}
      </strong>

      <button
        aria-label="다음 날짜"
        className="member-sidedishes__datebar-step"
        onClick={() => onShiftDate(1)}
        type="button"
      >
        <ChevronRight aria-hidden="true" size={18} />
      </button>

      <button
        className="member-sidedishes__datebar-today"
        disabled={isToday}
        onClick={onGoToday}
        type="button"
      >
        오늘
      </button>
    </div>
  );
}
