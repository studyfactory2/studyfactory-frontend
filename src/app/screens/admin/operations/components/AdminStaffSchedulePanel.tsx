import { CalendarClock, Pencil, RefreshCw } from 'lucide-react';
import { cx } from '../../../../shared/lib/cx';
import {
  Button,
  Card,
  SectionEmpty,
  SectionError,
  SectionLoading,
} from '../../../../shared/ui';
import type { AdminStaffScheduleState } from '../hooks/useAdminStaffSchedule';
import { AdminStaffScheduleBoard } from './AdminStaffScheduleBoard';
import { AdminStaffScheduleEditor } from './AdminStaffScheduleEditor';

export function AdminStaffSchedulePanel({
  branchName,
  schedule,
}: {
  branchName: string;
  schedule: AdminStaffScheduleState;
}) {
  return (
    <>
      <Card className="admin-schedule" padding="none">
        <header className="admin-schedule__header">
          <div className="admin-schedule__heading">
            <span aria-hidden="true" className="admin-schedule__heading-icon">
              <CalendarClock size={19} />
            </span>
            <div>
              <h3>주간 반복 근무표</h3>
              <p>{branchName} · 매주 같은 요일과 업무에 반복 적용돼요.</p>
            </div>
          </div>

          <div className="admin-schedule__header-actions">
            {schedule.request.ready && (
              <span className="admin-schedule__count">
                배정 <strong>{schedule.schedule.assignedCount}</strong>건
              </span>
            )}
            <button
              aria-label="근무표 새로고침"
              className={cx(
                'admin-schedule__refresh',
                schedule.request.refreshing && 'is-refreshing',
              )}
              disabled={schedule.request.refreshing}
              onClick={schedule.request.onRefresh}
              type="button"
            >
              <RefreshCw aria-hidden="true" size={15} />
            </button>
            <Button
              disabled={!schedule.request.ready}
              onClick={schedule.request.onEdit}
              size="sm"
              variant="subtle"
            >
              <Pencil aria-hidden="true" size={14} />
              수정
            </Button>
          </div>
        </header>

        <div className="admin-schedule__body">
          {schedule.request.errorMessage !== null && (
            <SectionError
              message={schedule.request.errorMessage}
              onRetry={schedule.request.onRetry}
            />
          )}

          {schedule.request.loading ? (
            <SectionLoading label="근무표를 불러오는 중이에요." />
          ) : !schedule.request.ready ? null : schedule.schedule
              .assignedCount === 0 ? (
            <SectionEmpty title="아직 배정된 근무가 없어요">
              <p>수정을 눌러 요일별 담당자를 입력해 주세요.</p>
            </SectionEmpty>
          ) : (
            <AdminStaffScheduleBoard draft={schedule.schedule.draft} />
          )}
        </div>
      </Card>

      {schedule.editor.open && (
        <AdminStaffScheduleEditor
          branchName={branchName}
          editor={schedule.editor}
        />
      )}
    </>
  );
}
