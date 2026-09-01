import { CalendarDays, Check, CirclePlus, RotateCcw, Save } from 'lucide-react';
import { useEffect, useRef, type ReactNode } from 'react';
import { Badge, Button, Spinner } from '../../../../components/ui';
import type {
  EditablePlanItem,
  EditorCell,
  PlanRow as ModelPlanRow,
} from '../plan-types';

export type PlanItem = EditablePlanItem;

export type PlanItemUpdate = Partial<Pick<PlanItem, 'content' | 'done'>>;

export type PlanCell = Exclude<EditorCell, null>;

export type PlanRow = ModelPlanRow;

export type PlanDay = {
  dayIndex: number;
  dayOfMonth: number;
  fullDateLabel: string;
  isToday: boolean;
  key: string;
  label: string;
  longLabel: string;
  shortDateLabel: string;
};

export type PlanHeroProps = {
  monthLabel: string;
};

export function PlanHero({ monthLabel }: PlanHeroProps) {
  return (
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
        <span>{monthLabel}</span>
      </div>
    </header>
  );
}

export type PlanSummaryProps = {
  icon: ReactNode;
  label: string;
  tone?: 'positive';
  value: string;
};

export function PlanSummary({ icon, label, tone, value }: PlanSummaryProps) {
  return (
    <div
      className={
        tone
          ? `member-plans__summary-item is-${tone}`
          : 'member-plans__summary-item'
      }
    >
      <span aria-hidden="true">{icon}</span>
      <div>
        <small>{label}</small>
        <strong>{value}</strong>
      </div>
    </div>
  );
}

export type PlanCellButtonProps = {
  ariaLabel: string;
  disabled?: boolean;
  items: readonly PlanItem[];
  onClick: () => void;
};

export function PlanCellButton({
  ariaLabel,
  disabled,
  items,
  onClick,
}: PlanCellButtonProps) {
  return (
    <button
      aria-label={ariaLabel}
      className="member-plans__cell"
      disabled={disabled}
      onClick={onClick}
      type="button"
    >
      <CellItems items={items} />
      <span className="member-plans__cell-edit">
        <CirclePlus aria-hidden="true" size={15} />
        {items.length ? '편집' : '계획 추가'}
      </span>
    </button>
  );
}

export type CellItemsProps = {
  compact?: boolean;
  items: readonly PlanItem[];
};

export function CellItems({ compact = false, items }: CellItemsProps) {
  const populatedItems = items.filter((item) => item.content.trim());
  const visibleCount = compact ? 2 : 3;

  if (!populatedItems.length) {
    return <span className="member-plans__cell-empty">비어 있음</span>;
  }

  return (
    <ul
      className={
        compact
          ? 'member-plans__cell-items is-compact'
          : 'member-plans__cell-items'
      }
    >
      {populatedItems.slice(0, visibleCount).map((item) => (
        <li className={item.done ? 'is-done' : ''} key={item.draftId}>
          <i aria-hidden="true">
            {item.done && <Check size={10} strokeWidth={3} />}
          </i>
          <span>{item.content}</span>
        </li>
      ))}
      {populatedItems.length > visibleCount && (
        <li className="is-more">+{populatedItems.length - visibleCount}개</li>
      )}
    </ul>
  );
}

export type PlanSaveBarProps = {
  loading: boolean;
  onSave: () => void;
};

export function PlanSaveBar({ loading, onSave }: PlanSaveBarProps) {
  return (
    <div className="member-plans__save-bar" aria-live="polite">
      <div>
        <span className="is-dirty">저장하지 않은 변경사항이 있어요.</span>
        <small>
          주간 저장은 현재 주의 목표와 모든 교시 계획을 함께 반영합니다.
        </small>
      </div>
      <Button loading={loading} onClick={onSave} size="lg">
        <Save aria-hidden="true" size={18} />
        주간 계획 저장
      </Button>
    </div>
  );
}

export function PlanLoadingState() {
  const headingRef = useInitialHeadingFocus();

  return (
    <section
      className="member-plans member-plans__state"
      aria-live="polite"
      role="status"
    >
      <Spinner size="lg" />
      <div>
        <h2 ref={headingRef} tabIndex={-1}>
          계획표를 준비하고 있어요.
        </h2>
        <p>이번 주 목표와 교시별 계획을 불러오는 중입니다.</p>
      </div>
    </section>
  );
}

export type DraftRouteConflictProps = {
  onDiscard: () => void;
  onRestore: () => void;
};

export function DraftRouteConflict({
  onDiscard,
  onRestore,
}: DraftRouteConflictProps) {
  const headingRef = useInitialHeadingFocus();

  return (
    <section className="member-plans member-plans__state" role="alert">
      <span className="member-plans__state-icon">
        <RotateCcw aria-hidden="true" size={24} />
      </span>
      <div>
        <h2 ref={headingRef} tabIndex={-1}>
          저장 전 계획과 이동한 날짜가 달라요.
        </h2>
        <p>
          브라우저의 이전·다음 이동으로 날짜가 바뀌었습니다. 작성 중인 계획으로
          돌아가거나 변경사항을 버리고 현재 날짜를 불러와 주세요.
        </p>
      </div>
      <div className="member-plans__state-actions">
        <Button onClick={onRestore}>작성 중인 계획으로 돌아가기</Button>
        <Button onClick={onDiscard} variant="ghost">
          변경사항 버리기
        </Button>
      </div>
    </section>
  );
}

export type PlanErrorStateProps = {
  message: string;
  onRetry: () => void;
};

export function PlanErrorState({ message, onRetry }: PlanErrorStateProps) {
  const headingRef = useInitialHeadingFocus();

  return (
    <section className="member-plans member-plans__state" role="alert">
      <span className="member-plans__state-icon">
        <RotateCcw aria-hidden="true" size={24} />
      </span>
      <div>
        <h2 ref={headingRef} tabIndex={-1}>
          계획표를 불러오지 못했어요.
        </h2>
        <p>{message || '잠시 후 다시 시도해 주세요.'}</p>
      </div>
      <Button onClick={onRetry} variant="ghost">
        다시 시도
      </Button>
    </section>
  );
}

function useInitialHeadingFocus() {
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  return headingRef;
}
