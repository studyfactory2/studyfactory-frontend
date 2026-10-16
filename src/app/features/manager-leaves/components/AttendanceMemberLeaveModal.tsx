import { useEffect, useState, type RefObject } from 'react';
import { RefreshCw } from 'lucide-react';
import type { SessionOwnerKey } from '../../../core/session';
import type { AttendanceLeaveManagementTarget } from '../../attendances/workspace/components/AttendanceBoard';
import {
  Button,
  Modal,
  SectionEmpty,
  SectionError,
  SectionLoading,
} from '../../../shared/ui';
import { formatKoreanDate } from '../../../shared/lib/seoul-date';
import { expandManagerLeaveCalendarPeriods } from '../../leaves/leave-management-model';
import {
  useAttendanceMemberLeave,
  type AttendanceMemberLeaveState,
} from '../hooks/useAttendanceMemberLeave';
import { ManagerLeaveCalendar } from './ManagerLeaveCalendar';
import '../styles/attendance-member-leave.css';

type AttendanceMemberLeaveModalProps = {
  branchId: number;
  dateKey: string;
  memberId: number;
  onClose: () => void;
  ownerKey: SessionOwnerKey;
  restoreFocusRef?: RefObject<HTMLElement | null>;
  target: AttendanceLeaveManagementTarget | null;
};

export function AttendanceMemberLeaveModal({
  branchId,
  dateKey,
  memberId,
  onClose,
  ownerKey,
  restoreFocusRef,
  target,
}: AttendanceMemberLeaveModalProps) {
  // Hide immediately on date rollover, then discard the old target so it
  // cannot reopen when the manager returns to that date.
  useEffect(() => {
    if (target !== null && target.dateKey !== dateKey) {
      onClose();
    }
  }, [dateKey, onClose, target]);

  if (target === null || target.dateKey !== dateKey) {
    return null;
  }

  return (
    <AttendanceMemberLeaveSession
      branchId={branchId}
      key={`${ownerKey}:${memberId}:${branchId}:${target.memberId}:${target.dateKey}:${target.slot}`}
      memberId={memberId}
      onClose={onClose}
      ownerKey={ownerKey}
      restoreFocusRef={restoreFocusRef}
      target={target}
    />
  );
}

function AttendanceMemberLeaveSession({
  branchId,
  memberId,
  onClose,
  ownerKey,
  restoreFocusRef,
  target,
}: Omit<AttendanceMemberLeaveModalProps, 'dateKey' | 'target'> & {
  target: AttendanceLeaveManagementTarget;
}) {
  const leaves = useAttendanceMemberLeave({
    branchId,
    initialDateKey: target.dateKey,
    memberId,
    ownerKey,
    targetMemberId: target.memberId,
  });

  return (
    <Modal
      footer={
        <Button onClick={onClose} variant="ghost">
          닫기
        </Button>
      }
      onClose={onClose}
      restoreFocusRef={restoreFocusRef}
      open
      panelClassName="attendance-member-leave-modal"
      title={
        leaves.member.selected
          ? `${leaves.member.selected.name} · 휴무 내역`
          : '사원 휴무 내역'
      }
    >
      <AttendanceMemberLeaveContent
        initialDateKey={target.dateKey}
        leaves={leaves}
      />
    </Modal>
  );
}

function AttendanceMemberLeaveContent({
  initialDateKey,
  leaves,
}: {
  initialDateKey: string;
  leaves: AttendanceMemberLeaveState;
}) {
  const [selectedDateKey, setSelectedDateKey] = useState<string | null>(
    initialDateKey,
  );
  const member = leaves.member.selected;
  const calendar = leaves.calendar;
  const selectedDay = calendar.cells.find(
    (cell) => cell.inMonth && cell.dateKey === selectedDateKey,
  );
  const currentMonth =
    calendar.month.year === calendar.today.year &&
    calendar.month.month === calendar.today.month;

  if (leaves.request.errorMessage !== null) {
    return (
      <SectionError
        message={leaves.request.errorMessage}
        onRetry={leaves.request.onRetry}
      />
    );
  }

  if (leaves.request.loading) {
    return <SectionLoading label="선택한 사원의 휴무를 확인하고 있어요." />;
  }

  if (leaves.member.unavailable || member === null) {
    return (
      <SectionEmpty title="선택한 사원을 찾을 수 없어요">
        <p>
          현재 지점의 등록 사원인지 확인한 뒤 출석부에서 다시 선택해 주세요.
        </p>
      </SectionEmpty>
    );
  }

  return (
    <div className="attendance-member-leave">
      <div className="attendance-member-leave__summary">
        <p>
          <strong>
            {member.seatNumber === null
              ? '좌석 미배정'
              : `${member.seatNumber}번 좌석`}
            {' · '}
            {member.role === 'STAFF' ? '스태프' : '회원'}
          </strong>
          <span>날짜를 눌러 휴무 사유와 교시를 확인하세요.</span>
        </p>
        <button
          aria-busy={leaves.request.refreshing}
          aria-label="휴무 내역 새로고침"
          className="attendance-member-leave__refresh"
          disabled={leaves.request.refreshing || leaves.deletion.pending}
          onClick={leaves.request.onRefresh}
          type="button"
        >
          <RefreshCw aria-hidden="true" size={16} />
        </button>
      </div>

      {calendar.errorMessage !== null ? (
        <SectionError
          message={calendar.errorMessage}
          onRetry={calendar.onRetry}
        />
      ) : calendar.loading ? (
        <SectionLoading label="월별 휴무를 불러오는 중이에요." />
      ) : (
        <>
          <div className="attendance-member-leave__calendar">
            <ManagerLeaveCalendar
              cells={calendar.cells}
              currentMonth={currentMonth}
              mode="view"
              month={calendar.month.month}
              onCurrentMonth={() => {
                setSelectedDateKey(calendar.today.dateKey);
                calendar.onCurrentMonth();
              }}
              onNextMonth={() => {
                setSelectedDateKey(null);
                calendar.onNextMonth();
              }}
              onPreviousMonth={() => {
                setSelectedDateKey(null);
                calendar.onPreviousMonth();
              }}
              onToggleDate={setSelectedDateKey}
              selectedDates={
                new Set(selectedDateKey === null ? [] : [selectedDateKey])
              }
              year={calendar.month.year}
            />
          </div>

          <section
            aria-label="선택한 날짜의 휴무 상세"
            aria-live="polite"
            className="attendance-member-leave__details"
          >
            {selectedDay ? (
              <>
                <h4>
                  <time dateTime={selectedDay.dateKey}>
                    {formatKoreanDate(selectedDay.dateKey)}
                  </time>
                  <span>휴무 내역</span>
                </h4>
                {selectedDay.entries.length === 0 ? (
                  <p>이 날짜에 등록된 휴무가 없어요.</p>
                ) : (
                  <ul>
                    {expandManagerLeaveCalendarPeriods(selectedDay.entries).map(
                      (entry) => (
                        <li key={entry.key}>
                          <strong>{entry.label}</strong>
                          <span>{entry.slot}교시</span>
                          <button
                            aria-busy={leaves.deletion.pendingKey === entry.key}
                            aria-label={`${formatKoreanDate(selectedDay.dateKey)} ${entry.slot}교시 ${entry.label} 삭제`}
                            className="attendance-member-leave__delete"
                            disabled={
                              leaves.deletion.disabled ||
                              entry.cancellationSource === null
                            }
                            onClick={() =>
                              leaves.deletion.onDelete(
                                selectedDay.dateKey,
                                entry.entryKey,
                                entry.slot,
                              )
                            }
                            title={
                              entry.cancellationSource === null
                                ? '서버 업데이트 후 휴무 내역을 새로고침해 주세요.'
                                : undefined
                            }
                            type="button"
                          >
                            {leaves.deletion.pendingKey === entry.key
                              ? '삭제 중'
                              : '삭제'}
                          </button>
                        </li>
                      ),
                    )}
                  </ul>
                )}
              </>
            ) : (
              <p>달력에서 조회할 날짜를 선택해 주세요.</p>
            )}
          </section>
        </>
      )}
    </div>
  );
}
