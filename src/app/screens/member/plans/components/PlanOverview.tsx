import { CalendarDays, PencilLine, Sparkles, Target } from 'lucide-react';
import { useState } from 'react';
import { Badge, Button, Field, Spinner, Textarea } from '../../../../shared/ui';
import '../styles/PlanOverview.css';

export type PlanOverviewProps = {
  completedCount: number;
  monthlyDirty: boolean;
  monthlyGoal: string;
  monthlyLabel: string;
  monthlyLoadError: boolean;
  monthlyLoading: boolean;
  monthlySaving: boolean;
  onMonthlyGoalChange: (value: string) => void;
  onMonthlyRetry: () => void;
  onMonthlySave: () => void;
  onWeeklyGoalChange: (value: string) => void;
  progress: number;
  totalCount: number;
  weekRangeLabel: string;
  weeklyDirty: boolean;
  weeklyGoal: string;
  weeklySaving: boolean;
};

export function PlanOverview({
  completedCount,
  monthlyDirty,
  monthlyGoal,
  monthlyLabel,
  monthlyLoadError,
  monthlyLoading,
  monthlySaving,
  onMonthlyGoalChange,
  onMonthlyRetry,
  onMonthlySave,
  onWeeklyGoalChange,
  progress,
  totalCount,
  weekRangeLabel,
  weeklyDirty,
  weeklyGoal,
  weeklySaving,
}: PlanOverviewProps) {
  const [monthlyEditorOpen, setMonthlyEditorOpen] = useState(false);
  const [weeklyEditorOpen, setWeeklyEditorOpen] = useState(false);
  const monthlyExpanded =
    monthlyEditorOpen || monthlyLoading || monthlyLoadError;

  return (
    <>
      <header className="member-plans__hero">
        <div>
          <Badge dot tone="special">
            MY STUDY PLAN
          </Badge>
          <h2>한 주를 설계하고, 오늘을 완성해요.</h2>
          <p>
            월간 목표부터 교시별 할 일까지 한곳에서 정리하고 완료한 계획을
            차곡차곡 기록하세요.
          </p>
        </div>
        <div className="member-plans__hero-mark" aria-hidden="true">
          <CalendarDays size={30} strokeWidth={1.8} />
          <span>{monthlyLabel}</span>
        </div>
      </header>

      <div className="member-plans__goal-grid">
        <article
          className={`member-plans__goal-card member-plans__goal-card--monthly${
            monthlyExpanded ? ' is-editor-open' : ''
          }`}
        >
          <div className="member-plans__goal-heading">
            <span className="member-plans__goal-icon">
              <Target aria-hidden="true" size={20} />
            </span>
            <div>
              <p>{monthlyLabel}</p>
              <h3>이번 달 목표</h3>
            </div>
            <div className="member-plans__goal-actions">
              {monthlyDirty && <Badge tone="accent">수정됨</Badge>}
              <button
                aria-controls="member-plans-monthly-editor"
                aria-expanded={monthlyExpanded}
                className="member-plans__goal-toggle"
                disabled={monthlyLoading}
                onClick={() => setMonthlyEditorOpen((open) => !open)}
                type="button"
              >
                <PencilLine aria-hidden="true" size={15} />
                {monthlyExpanded ? '닫기' : '편집'}
              </button>
            </div>
          </div>

          <p className="member-plans__goal-preview">
            {monthlyGoal.trim() || '아직 월간 목표가 없어요.'}
          </p>

          <div
            className="member-plans__goal-editor"
            id="member-plans-monthly-editor"
          >
            {monthlyLoading ? (
              <div className="member-plans__goal-loading">
                <Spinner size="sm" /> 목표를 불러오는 중이에요.
              </div>
            ) : monthlyLoadError ? (
              <div className="member-plans__inline-error" role="alert">
                <span>월간 목표를 불러오지 못했어요.</span>
                <button onClick={onMonthlyRetry} type="button">
                  다시 시도
                </button>
              </div>
            ) : (
              <>
                <Field label="월간 목표">
                  {(id) => (
                    <Textarea
                      disabled={monthlySaving}
                      id={id}
                      onChange={(event) =>
                        onMonthlyGoalChange(event.target.value)
                      }
                      placeholder="이번 달에 꼭 이루고 싶은 목표를 적어보세요."
                      rows={3}
                      value={monthlyGoal}
                    />
                  )}
                </Field>
                <Button
                  disabled={!monthlyDirty}
                  loading={monthlySaving}
                  onClick={onMonthlySave}
                  size="sm"
                  variant="ghost"
                >
                  월간 목표 저장
                </Button>
              </>
            )}
          </div>
        </article>

        <article
          className={`member-plans__goal-card member-plans__goal-card--weekly${
            weeklyEditorOpen ? ' is-editor-open' : ''
          }`}
        >
          <div className="member-plans__goal-heading">
            <span className="member-plans__goal-icon">
              <Sparkles aria-hidden="true" size={20} />
            </span>
            <div>
              <p>{weekRangeLabel}</p>
              <h3>이번 주 목표</h3>
            </div>
            <div className="member-plans__goal-actions">
              {weeklyDirty && <Badge tone="accent">저장 전</Badge>}
              <button
                aria-controls="member-plans-weekly-editor"
                aria-expanded={weeklyEditorOpen}
                className="member-plans__goal-toggle"
                onClick={() => setWeeklyEditorOpen((open) => !open)}
                type="button"
              >
                <PencilLine aria-hidden="true" size={15} />
                {weeklyEditorOpen ? '닫기' : '편집'}
              </button>
            </div>
          </div>

          <p className="member-plans__goal-preview">
            {weeklyGoal.trim() || '아직 주간 목표가 없어요.'}
          </p>

          <div
            className="member-plans__goal-editor"
            id="member-plans-weekly-editor"
          >
            <Field label="주간 목표">
              {(id) => (
                <Textarea
                  disabled={weeklySaving}
                  id={id}
                  onChange={(event) => onWeeklyGoalChange(event.target.value)}
                  placeholder="이번 주의 가장 중요한 목표를 적어보세요."
                  rows={3}
                  value={weeklyGoal}
                />
              )}
            </Field>
          </div>
          <div className="member-plans__weekly-progress">
            <div>
              <span>완료율</span>
              <strong>{progress}%</strong>
            </div>
            <div
              aria-label={`이번 주 계획 ${totalCount}개 중 ${completedCount}개 완료`}
              aria-valuemax={100}
              aria-valuemin={0}
              aria-valuenow={progress}
              className="member-plans__progress-track"
              role="progressbar"
            >
              <span style={{ width: `${progress}%` }} />
            </div>
          </div>
        </article>
      </div>
    </>
  );
}
