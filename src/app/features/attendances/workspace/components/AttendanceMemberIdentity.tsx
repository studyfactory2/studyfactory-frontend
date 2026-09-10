import { cx } from '../../../../shared/lib/cx';
import {
  formatKoreanDate,
  formatTimeOfDayFromEpochMs,
} from '../../../../shared/lib/seoul-date';
import type { AttendanceBoardMember } from '../model/attendance-board';

export type AttendancePresenceLoadState = 'error' | 'loading' | 'ready';

type AttendanceMemberIdentityProps = {
  dateKey: string;
  disabled: boolean;
  interactive: boolean;
  member: AttendanceBoardMember;
  onPresenceRequest: (member: AttendanceBoardMember) => void;
  presencePending: boolean;
  presenceState: AttendancePresenceLoadState;
};

export function AttendanceMemberIdentity({
  dateKey,
  disabled,
  interactive,
  member,
  onPresenceRequest,
  presencePending,
  presenceState,
}: AttendanceMemberIdentityProps) {
  const currentlyActive = member.presence?.currentlyActive ?? false;

  return (
    <span className="staff-attendance__member">
      <b
        aria-label={
          member.seatNumber === null
            ? '좌석 미배정'
            : `${member.seatNumber}번 좌석`
        }
        className={member.seatNumber === null ? 'is-unassigned' : undefined}
      >
        {member.seatNumber === null ? '미배정' : member.seatNumber}
      </b>
      <span className="staff-attendance__member-copy">
        <span className="staff-attendance__member-name">
          <strong>{member.name}</strong>
          {presenceState === 'ready' &&
            member.presence !== null &&
            member.presence.sessionCount > 1 && (
              <em
                aria-label={`${formatKoreanDate(dateKey)} ${member.presence.sessionCount}회 입실`}
                className="staff-attendance__session-count"
                title={`${formatKoreanDate(dateKey)} ${member.presence.sessionCount}회 입실`}
              >
                {member.presence.sessionCount}회
              </em>
            )}
          {interactive &&
            member.stage === 'active' &&
            presenceState === 'ready' && (
              <button
                aria-busy={presencePending}
                aria-label={`${member.name} ${currentlyActive ? '수동 퇴실 처리' : '수동 입실 등록'}`}
                className={cx(
                  'staff-attendance__presence-button',
                  currentlyActive && 'is-checkout',
                )}
                disabled={disabled}
                onClick={() => onPresenceRequest(member)}
                type="button"
              >
                {presencePending
                  ? '처리 중'
                  : currentlyActive
                    ? '퇴실'
                    : '입실'}
              </button>
            )}
        </span>
        <MemberPresence member={member} presenceState={presenceState} />
      </span>
    </span>
  );
}

function MemberPresence({
  member,
  presenceState,
}: {
  member: AttendanceBoardMember;
  presenceState: AttendancePresenceLoadState;
}) {
  if (presenceState !== 'ready') {
    return (
      <small className="staff-attendance__member-presence is-muted">
        {presenceState === 'error' ? '입퇴실 시간 미확인' : '입퇴실 확인 중'}
      </small>
    );
  }

  const { checkedInAt, checkedOutAt, currentlyActive } = member.presence ?? {
    checkedInAt: null,
    checkedOutAt: null,
    currentlyActive: false,
  };

  return (
    <small className="staff-attendance__member-presence">
      <span>
        <i>입실</i>
        <PresenceTime value={checkedInAt} />
      </span>
      <span aria-hidden="true" className="staff-attendance__time-divider">
        ·
      </span>
      <span>
        <i>퇴실</i>
        {currentlyActive ? (
          <em className="is-active">입실 중</em>
        ) : (
          <PresenceTime value={checkedOutAt} />
        )}
      </span>
    </small>
  );
}

function PresenceTime({ value }: { value: string | null }) {
  if (!value) {
    return <span>—</span>;
  }

  const epochMs = Date.parse(value);

  if (!Number.isFinite(epochMs)) {
    return <span>—</span>;
  }

  return <time dateTime={value}>{formatTimeOfDayFromEpochMs(epochMs)}</time>;
}
