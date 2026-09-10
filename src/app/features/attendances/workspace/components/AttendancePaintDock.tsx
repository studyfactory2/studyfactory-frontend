import { cx } from '../../../../shared/lib/cx';
import type { AttendancePaintMode } from '../model/attendance-board';

const PAINT_OPTIONS = [
  { label: '출석', mark: 'O', status: 'PRESENT' },
  { label: '미출석', mark: 'X', status: 'ABSENT' },
  { label: '기타', mark: '기', status: 'OTHER' },
] as const satisfies ReadonlyArray<{
  label: string;
  mark: string;
  status: Exclude<AttendancePaintMode, null>;
}>;

type AttendancePaintDockProps = {
  mode: AttendancePaintMode;
  onExit: () => void;
  onModeChange: (mode: Exclude<AttendancePaintMode, null>) => void;
};

export function AttendancePaintDock({
  mode,
  onExit,
  onModeChange,
}: AttendancePaintDockProps) {
  const activeLabel = PAINT_OPTIONS.find(
    (option) => option.status === mode,
  )?.label;

  return (
    <div
      aria-label="출석 상태 빠른 처리"
      className={cx('staff-attendance__action-bar', mode && 'is-mode-active')}
      role="region"
    >
      <p aria-live="polite" className="staff-attendance__action-target">
        {activeLabel
          ? `${activeLabel} 모드 · 출석 칸을 누르면 바로 처리해요.`
          : '상태를 먼저 선택한 뒤 출석 칸을 누르세요.'}
      </p>

      <div
        aria-label="출석 처리 모드"
        className="staff-attendance__action-buttons"
        role="group"
      >
        {PAINT_OPTIONS.map((option) => {
          const active = mode === option.status;

          return (
            <button
              aria-label={`${option.label} 모드 ${active ? '선택됨' : '선택'}`}
              aria-pressed={active}
              className={cx(
                `is-${option.status.toLocaleLowerCase()}`,
                active && 'is-active',
              )}
              key={option.status}
              onClick={() => onModeChange(option.status)}
              type="button"
            >
              <b aria-hidden="true">{option.mark}</b>
              <span>{option.label}</span>
            </button>
          );
        })}
        <button
          aria-label="빠른 처리 모드 종료"
          className="is-clear"
          disabled={mode === null}
          onClick={onExit}
          type="button"
        >
          <b aria-hidden="true">—</b>
          <span>종료</span>
        </button>
      </div>
    </div>
  );
}
