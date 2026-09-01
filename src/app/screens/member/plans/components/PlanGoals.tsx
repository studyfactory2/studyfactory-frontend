import { Sparkles, Target } from 'lucide-react';
import {
  Badge,
  Button,
  Field,
  Spinner,
  Textarea,
} from '../../../../components/ui';

export type PlanGoalsProps = {
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

export function PlanGoals({
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
}: PlanGoalsProps) {
  return (
    <div className="member-plans__goal-grid">
      <article className="member-plans__goal-card member-plans__goal-card--monthly">
        <div className="member-plans__goal-heading">
          <span className="member-plans__goal-icon">
            <Target aria-hidden="true" size={20} />
          </span>
          <div>
            <p>{monthlyLabel}</p>
            <h3>이번 달 목표</h3>
          </div>
          {monthlyDirty && <Badge tone="accent">수정됨</Badge>}
        </div>

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
                  onChange={(event) => onMonthlyGoalChange(event.target.value)}
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
      </article>

      <article className="member-plans__goal-card member-plans__goal-card--weekly">
        <div className="member-plans__goal-heading">
          <span className="member-plans__goal-icon">
            <Sparkles aria-hidden="true" size={20} />
          </span>
          <div>
            <p>{weekRangeLabel}</p>
            <h3>이번 주 목표</h3>
          </div>
          {weeklyDirty && <Badge tone="accent">저장 전</Badge>}
        </div>
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
  );
}
