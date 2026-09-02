import { RotateCcw, Save } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { Button, Spinner } from '../../../../shared/ui';
import '../styles/PlanStatus.css';

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
