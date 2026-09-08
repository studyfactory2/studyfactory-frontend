import { DoorOpen } from 'lucide-react';
import type { StudyPresenceManagerSessionResponse } from '../../../../features/study-presence/study-presence-api';
import {
  Badge,
  Card,
  CardHeader,
  SectionEmpty,
  SectionError,
  SectionLoading,
} from '../../../../shared/ui';
import { formatTimeOfDayFromEpochMs } from '../../../../shared/lib/seoul-date';

type LivePresencePanelProps = {
  asOfLabel: string | null;
  errorMessage: string | null;
  loading: boolean;
  onRetry: () => void;
  ready: boolean;
  sessions: StudyPresenceManagerSessionResponse[];
};

export function LivePresencePanel({
  asOfLabel,
  errorMessage,
  loading,
  onRetry,
  ready,
  sessions,
}: LivePresencePanelProps) {
  return (
    <Card className="staff-attendance__presence">
      <CardHeader
        aside={
          ready ? (
            <Badge dot tone="positive">
              {sessions.length}명
            </Badge>
          ) : undefined
        }
        title={
          <span className="staff-attendance__presence-title">
            <DoorOpen aria-hidden="true" size={18} />
            현재 입실
          </span>
        }
      />
      <p className="staff-attendance__presence-note">
        QR 또는 관리자 입실 후 아직 퇴실하지 않은 회원입니다.
      </p>

      {loading && <SectionLoading label="입실 현황을 확인하고 있어요." />}
      {errorMessage && (
        <SectionError message={errorMessage} onRetry={onRetry} />
      )}
      {ready && sessions.length === 0 && (
        <SectionEmpty title="현재 입실 중인 회원이 없어요.">
          <p>새 입실이 확인되면 이 목록에 표시됩니다.</p>
        </SectionEmpty>
      )}
      {ready && sessions.length > 0 && (
        <ol className="staff-attendance__presence-list">
          {sessions.map((session) => (
            <li key={session.sessionId}>
              <span
                aria-label={
                  session.seatNumber === null
                    ? '좌석 미배정'
                    : `${session.seatNumber}번 좌석`
                }
                className="staff-attendance__presence-seat"
              >
                {session.seatNumber ?? '—'}
              </span>
              <span className="staff-attendance__presence-member">
                <strong>{session.memberName ?? '이름 확인 필요'}</strong>
                <small>
                  {formatCheckedInAt(session.checkedInAt)} 입실
                  {session.checkInMethod === 'MANAGER' &&
                    session.manualCheckInReason && (
                      <em>{session.manualCheckInReason}</em>
                    )}
                </small>
              </span>
              <Badge
                tone={
                  session.checkInMethod === 'MANAGER' ? 'special' : 'neutral'
                }
              >
                {session.checkInMethod === 'MANAGER' ? '수동' : 'QR'}
              </Badge>
            </li>
          ))}
        </ol>
      )}

      {asOfLabel && (
        <p className="staff-attendance__presence-asof">
          <i aria-hidden="true" /> {asOfLabel} 기준 · 30초마다 갱신
        </p>
      )}
    </Card>
  );
}

function formatCheckedInAt(value: string) {
  const epochMs = Date.parse(value);

  return Number.isFinite(epochMs)
    ? formatTimeOfDayFromEpochMs(epochMs)
    : '시간 미확인';
}
