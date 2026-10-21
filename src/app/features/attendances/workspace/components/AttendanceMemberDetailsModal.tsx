import {
  formatDottedDate,
  formatKoreanDate,
  formatTimeOfDayFromEpochMs,
} from '../../../../shared/lib/seoul-date';
import { Button, Modal } from '../../../../shared/ui';
import {
  ATTENDANCE_SLOTS,
  type AttendanceBoardMember,
} from '../model/attendance-board';
import type { AttendancePresenceLoadState } from './AttendanceMemberIdentity';
import {
  getActiveExcessLeaveRequests,
  isExcessMemberLeaveCell,
} from '../model/attendance-excess-leave';

type AttendanceMemberDetailsModalProps = {
  dateKey: string;
  interactive: boolean;
  member: AttendanceBoardMember | null;
  onClose: () => void;
  onPresenceRequest: (member: AttendanceBoardMember) => void;
  pending: boolean;
  presenceState: AttendancePresenceLoadState;
};

export function AttendanceMemberDetailsModal({
  dateKey,
  interactive,
  member,
  onClose,
  onPresenceRequest,
  pending,
  presenceState,
}: AttendanceMemberDetailsModalProps) {
  const checkingOut = (member?.presence?.activeSessionId ?? null) !== null;
  const excessRequests = getActiveExcessLeaveRequests(
    member?.excessLeaveRequests,
  );
  const warningWeek = excessRequests[0]?.weeklyAllowance;
  const canManagePresence =
    member !== null &&
    interactive &&
    presenceState === 'ready' &&
    member.stage === 'active' &&
    (member.role === 'MEMBER' || checkingOut);

  return (
    <Modal
      footer={
        <>
          <Button onClick={onClose} variant="ghost">
            닫기
          </Button>
          {canManagePresence && member && (
            <Button
              disabled={pending}
              loading={pending}
              onClick={() => onPresenceRequest(member)}
            >
              {checkingOut ? '수동 퇴실' : '수동 입실'}
            </Button>
          )}
        </>
      }
      onClose={onClose}
      open={member !== null}
      panelClassName="staff-attendance__member-details-modal"
      size="sm"
      title="사원 출석 상세"
    >
      {member && (
        <div className="staff-attendance__member-details">
          <div className="staff-attendance__member-details-identity">
            <strong>{member.name}</strong>
            <span>
              {member.seatNumber === null
                ? '좌석 미배정'
                : `${member.seatNumber}번 좌석`}
              {' · '}
              {member.role === 'STAFF' ? '스태프' : '회원'}
            </span>
            <time dateTime={dateKey}>{formatKoreanDate(dateKey)}</time>
          </div>

          {member.stage !== 'active' && (
            <p className="staff-attendance__member-details-stage">
              <strong>
                {member.stage === 'starts-today' ? '해당일 입사' : '입사 예정'}
              </strong>
              {member.joinDate && (
                <time dateTime={member.joinDate}>
                  {formatKoreanDate(member.joinDate)}
                </time>
              )}
              <span>입사일부터 출석 기록이 표시돼요.</span>
            </p>
          )}

          {warningWeek && (
            <section
              aria-label="초과휴무 신청 내역"
              className="staff-attendance__excess-details"
            >
              <h4>
                초과휴무 <span>{excessRequests.length}건</span>
              </h4>
              <p className="staff-attendance__excess-week">
                <time dateTime={warningWeek.weekStart}>
                  {formatDottedDate(warningWeek.weekStart)}
                </time>
                {' – '}
                <time dateTime={warningWeek.weekEnd}>
                  {formatDottedDate(warningWeek.weekEnd)}
                </time>
              </p>
              <ul>
                {excessRequests.map((request) => (
                  <li key={request.leaveId}>
                    <strong>{request.label}</strong>
                    <span>{request.slots.join('·')}교시</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section
            aria-label="입퇴실 기록"
            className="staff-attendance__member-details-presence"
          >
            <h4>입퇴실 기록</h4>
            {presenceState === 'ready' ? (
              <dl>
                <div>
                  <dt>첫 입실</dt>
                  <dd>
                    <PresenceTime
                      value={member.presence?.checkedInAt ?? null}
                    />
                  </dd>
                </div>
                <div>
                  <dt>최종 퇴실</dt>
                  <dd>
                    {member.presence?.currentlyActive ? (
                      '입실 중'
                    ) : (
                      <PresenceTime
                        value={member.presence?.checkedOutAt ?? null}
                      />
                    )}
                  </dd>
                </div>
                <div>
                  <dt>입퇴실 상태</dt>
                  <dd>
                    {member.presence?.currentlyActive
                      ? '입실 중'
                      : (member.presence?.sessionCount ?? 0) > 0
                        ? '퇴실 완료'
                        : '입실 기록 없음'}
                  </dd>
                </div>
                <div>
                  <dt>입실 횟수</dt>
                  <dd>{member.presence?.sessionCount ?? 0}회</dd>
                </div>
              </dl>
            ) : (
              <p role="status">
                {presenceState === 'error'
                  ? '입퇴실 기록을 불러오지 못했어요. 입퇴실 시간은 미확인 상태예요.'
                  : '입퇴실 기록을 확인하고 있어요.'}
              </p>
            )}
          </section>

          <section
            aria-label="교시별 출석"
            className="staff-attendance__member-details-attendance"
          >
            <h4>교시별 출석</h4>
            <dl>
              {ATTENDANCE_SLOTS.map((slot) => {
                const cell = member.slots[slot - 1];
                const state = cell?.state ?? 'unmarked';
                const excess = isExcessMemberLeaveCell(
                  cell,
                  member.excessLeaveRequests,
                  slot,
                );
                const label =
                  state === 'present'
                    ? 'O · 출석'
                    : state === 'absent'
                      ? 'X · 결석'
                      : state === 'unmarked'
                        ? '— · 미확인'
                        : cell?.label;

                return (
                  <div
                    className={`is-${state}${excess ? ' has-excess-leave' : ''}`}
                    key={slot}
                  >
                    <dt>{slot}교시</dt>
                    <dd>
                      {label}
                      {excess && (
                        <span className="staff-attendance__excess-detail-note">
                          초과휴무 신청 있음
                        </span>
                      )}
                    </dd>
                  </div>
                );
              })}
            </dl>
          </section>
        </div>
      )}
    </Modal>
  );
}

function PresenceTime({ value }: { value: string | null }) {
  const epochMs = value ? Date.parse(value) : Number.NaN;

  if (!value || !Number.isFinite(epochMs)) {
    return <span>—</span>;
  }

  return <time dateTime={value}>{formatTimeOfDayFromEpochMs(epochMs)}</time>;
}
