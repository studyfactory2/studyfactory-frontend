import { CornerDownLeft } from 'lucide-react';
import type { AttendanceSelection } from '../model/attendance-board';

type AttendanceCommandDockProps = {
  canAdvance: boolean;
  onAdvance: () => void;
  onMarkAbsent: () => void;
  onMarkOther: () => void;
  onMarkPresent: () => void;
  pending: boolean;
  selection: AttendanceSelection | null;
};

export function AttendanceCommandDock({
  canAdvance,
  onAdvance,
  onMarkAbsent,
  onMarkOther,
  onMarkPresent,
  pending,
  selection,
}: AttendanceCommandDockProps) {
  const disabled = selection === null || pending;
  const targetLabel = selection
    ? `${selection.seatNumber === null ? '미배정' : `${selection.seatNumber}번`} ${selection.name} · ${selection.slot}교시`
    : '처리할 출석 칸을 선택하세요.';

  return (
    <div
      aria-label="선택한 출석 칸 빠른 처리"
      className="staff-attendance__action-bar"
      role="region"
    >
      <p aria-live="polite" className="staff-attendance__action-target">
        {targetLabel}
      </p>

      <div
        aria-label="출석 처리 명령"
        className="staff-attendance__action-buttons"
        role="group"
      >
        <button
          aria-label="선택한 칸 출석 처리"
          className="is-present"
          disabled={disabled || selection?.cell.state === 'present'}
          onClick={onMarkPresent}
          type="button"
        >
          <b aria-hidden="true">O</b>
          <span>출석</span>
        </button>
        <button
          aria-label="선택한 칸 결석 처리"
          className="is-absent"
          disabled={disabled || selection?.cell.state === 'absent'}
          onClick={onMarkAbsent}
          type="button"
        >
          <b aria-hidden="true">X</b>
          <span>결석</span>
        </button>
        <button
          aria-label="선택한 칸 기타 사유 등록"
          className="is-other"
          disabled={disabled}
          onClick={onMarkOther}
          type="button"
        >
          <span>기타</span>
        </button>
        <button
          aria-label="다음 출석 칸으로 이동"
          className="is-next"
          disabled={disabled || !canAdvance}
          onClick={onAdvance}
          title="다음 칸"
          type="button"
        >
          <CornerDownLeft aria-hidden="true" size={18} />
          <span className="staff-attendance__sr-only">다음</span>
        </button>
      </div>
    </div>
  );
}
