import { useState } from 'react';
import { BookOpenCheck } from 'lucide-react';
import type { SessionOwnerKey } from '../../../../core/session';
import type { MemberResponse } from '../../../../features/members/members-api';
import { SharedPlanEditor } from '../../../../features/plans/SharedPlanEditor';
import { useSeoulToday } from '../../../../shared/hooks/useSeoulToday';
import { getWeekStartKey } from '../../../../shared/lib/seoul-date';
import { Badge, Modal } from '../../../../shared/ui';
import '../styles/member-weekly-plan-viewer.css';

type MemberWeeklyPlanViewerProps = {
  member: MemberResponse;
  onClose: () => void;
  operatorMemberId: number;
  ownerKey: SessionOwnerKey;
};

export function MemberWeeklyPlanViewer({
  member,
  onClose,
  operatorMemberId,
  ownerKey,
}: MemberWeeklyPlanViewerProps) {
  const today = useSeoulToday();
  const currentWeek = getWeekStartKey(today.dateKey);
  const [weekStartDate, setWeekStartDate] = useState(currentWeek);
  const [dayIndex, setDayIndex] = useState(() =>
    Math.round(
      (Date.parse(today.dateKey + 'T00:00:00Z') -
        Date.parse(currentWeek + 'T00:00:00Z')) /
        86_400_000,
    ),
  );

  return (
    <Modal
      onClose={onClose}
      open
      panelClassName="admin-member-plan-modal"
      size="lg"
      title="주간 계획 보기"
    >
      <div className="admin-member-plan">
        <header className="admin-member-plan__toolbar">
          <div className="admin-member-plan__identity">
            <span aria-hidden="true">
              <BookOpenCheck size={19} />
            </span>
            <div>
              <strong>{member.name}</strong>
              <small>
                {member.seatNumber === null
                  ? '미배정 회원'
                  : member.seatNumber + '번 좌석 회원'}
              </small>
            </div>
            <Badge tone="neutral">읽기 전용</Badge>
          </div>
        </header>

        <SharedPlanEditor
          dayIndex={dayIndex}
          memberId={member.id}
          onDateChange={(week, day) => {
            setWeekStartDate(week);
            setDayIndex(day);
          }}
          onDayChange={setDayIndex}
          onWeekChange={setWeekStartDate}
          operatorMemberId={operatorMemberId}
          ownerKey={ownerKey}
          readOnly
          targetBranchId={member.branchId}
          title="교시별 계획"
          weekStartDate={weekStartDate}
        />
      </div>
    </Modal>
  );
}
