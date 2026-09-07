import { Card, CardHeader, SectionEmpty } from '../../../../shared/ui';
import type { BeverageAlert } from '../model/staff-beverages';

type BeverageAlertsProps = {
  changes: BeverageAlert[];
  errorMessage: string | null;
  lateLeaves: BeverageAlert[];
  loading: boolean;
};

export function BeverageAlerts({
  changes,
  errorMessage,
  lateLeaves,
  loading,
}: BeverageAlertsProps) {
  return (
    <div className="staff-bev__alerts">
      <AlertList
        emptyLabel="오늘 변경된 음료 없음"
        items={changes}
        title="오늘 신청·변경"
      />
      <AlertList
        emptyLabel={
          loading
            ? '휴무 신청을 확인하는 중'
            : errorMessage
              ? '휴무 신청을 불러오지 못했어요'
              : '8시 이후 신청 없음'
        }
        items={errorMessage ? [] : lateLeaves}
        note="이 시간에 들어온 휴무는 이미 만든 음료가 남습니다."
        title="8시 이후 휴무 신청"
        tone="warn"
      />
    </div>
  );
}

function AlertList({
  emptyLabel,
  items,
  note,
  title,
  tone,
}: {
  emptyLabel: string;
  items: BeverageAlert[];
  note?: string;
  title: string;
  tone?: 'warn';
}) {
  return (
    <Card className="staff-bev__card">
      <CardHeader
        aside={
          items.length > 0 && (
            <span
              className={
                tone === 'warn'
                  ? 'staff-bev__badge is-warn'
                  : 'staff-bev__badge'
              }
            >
              {items.length}
            </span>
          )
        }
        title={title}
      />
      {note && items.length > 0 && (
        <p className="staff-bev__section-note">{note}</p>
      )}

      {items.length === 0 ? (
        <SectionEmpty title={emptyLabel} />
      ) : (
        <ul className="staff-bev__alert-list">
          {items.map((item) => (
            <li key={item.id}>
              <span>{item.label}</span>
              <span className="staff-bev__alert-detail">{item.detail}</span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
