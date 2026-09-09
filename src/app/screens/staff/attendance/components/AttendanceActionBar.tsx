import { X } from 'lucide-react';
import type { AttendanceSelection } from '../model/staff-attendance';

type AttendanceActionBarProps = {
  onAbsent: () => void;
  onClear: () => void;
  onOther: () => void;
  onPresent: () => void;
  pending: boolean;
  selection: AttendanceSelection | null;
};

export function AttendanceActionBar({
  onAbsent,
  onClear,
  onOther,
  onPresent,
  pending,
  selection,
}: AttendanceActionBarProps) {
  return (
    <div
      aria-label="선택한 출석 상태 변경"
      className="staff-attendance__action-bar"
      role="region"
    >
      <div aria-live="polite" className="staff-attendance__action-target">
        {selection ? (
          <>
            <small>선택한 칸</small>
            <strong>
              {selection.seatNumber === null
                ? '미배정'
                : `${selection.seatNumber}번`}{' '}
              {selection.name} · {selection.slot}교시
            </strong>
          </>
        ) : (
          <>
            <small>빠른 출석 처리</small>
            <strong>회원의 교시 칸을 선택하세요.</strong>
          </>
        )}
      </div>

      <div className="staff-attendance__action-buttons">
        <button
          className="is-present"
          disabled={!selection || pending}
          onClick={onPresent}
          type="button"
        >
          O 출석
        </button>
        <button
          className="is-absent"
          disabled={!selection || pending}
          onClick={onAbsent}
          type="button"
        >
          X 미출석
        </button>
        <button
          className="is-other"
          disabled={!selection || pending}
          onClick={onOther}
          type="button"
        >
          기타 사유
        </button>
        <button
          aria-label="출석 칸 선택 해제"
          className="is-clear"
          disabled={!selection || pending}
          onClick={onClear}
          title="선택 해제"
          type="button"
        >
          <X aria-hidden="true" size={16} />
        </button>
      </div>

      {pending && (
        <span className="staff-attendance__action-pending" role="status">
          저장 중
        </span>
      )}
    </div>
  );
}
