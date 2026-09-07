import { Instrument } from '../../../../../shared/ui';
import { formatMonthDay } from '../../../../../shared/lib/seoul-date';
import '../styles/SideDishMonthPanel.css';

export type SideDishMonthPanelProps = {
  monthLabel: string;
  onSelectDate: (dateKey: string) => void;
  orderedDates: ReadonlySet<string>;
  selectedDateKey: string;
};

/**
 * The month, from data the screen already has: the order-dates endpoint is
 * called for the whole month to put the dot on the date bar, so nothing new
 * is fetched to show which days have an order.
 */
export function SideDishMonthPanel({
  monthLabel,
  onSelectDate,
  orderedDates,
  selectedDateKey,
}: SideDishMonthPanelProps) {
  const dates = [...orderedDates].sort();

  return (
    <aside className="member-sidedishes__month">
      <Instrument label="이번 달 반찬" note={monthLabel}>
        <div className="instrument__readout">
          <strong className="instrument__value">
            {dates.length}
            <em>일</em>
          </strong>
          <span className="instrument__caption">신청한 날</span>
        </div>
      </Instrument>

      <div className="member-sidedishes__month-card">
        <h3>신청한 날</h3>
        {dates.length === 0 ? (
          <p className="member-sidedishes__month-empty">
            이번 달에는 아직 신청한 반찬이 없어요.
          </p>
        ) : (
          <ul className="member-sidedishes__month-chips">
            {dates.map((dateKey) => (
              <li key={dateKey}>
                <button
                  aria-current={dateKey === selectedDateKey}
                  onClick={() => onSelectDate(dateKey)}
                  type="button"
                >
                  {formatMonthDay(dateKey)}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </aside>
  );
}
