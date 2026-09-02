import { useSession, type SessionOwnerKey } from '../../../core/session';
import { PlanEditorModal } from './components/PlanEditorModal';
import { PlanOverview } from './components/PlanOverview';
import {
  DraftRouteConflict,
  PlanErrorState,
  PlanLoadingState,
  PlanSaveBar,
} from './components/PlanStatus';
import { WeeklyPlanner } from './components/WeeklyPlanner';
import { useMemberPlans } from './hooks/useMemberPlans';
import './styles/MemberPlansScreen.css';

export function MemberPlansScreen() {
  const { memberId, ownerKey } = useSession();

  if (memberId === null || ownerKey === null) {
    return null;
  }

  return (
    <MemberPlansWorkspace
      key={ownerKey}
      memberId={memberId}
      queryOwnerKey={ownerKey}
    />
  );
}

function MemberPlansWorkspace({
  memberId,
  queryOwnerKey,
}: {
  memberId: number;
  queryOwnerKey: SessionOwnerKey;
}) {
  const plans = useMemberPlans(memberId, queryOwnerKey);

  if (plans.conflict) {
    return <DraftRouteConflict {...plans.conflictProps} />;
  }

  if (plans.loading) {
    return <PlanLoadingState />;
  }

  if (plans.errorMessage !== null) {
    return (
      <PlanErrorState message={plans.errorMessage} onRetry={plans.onRetry} />
    );
  }

  return (
    <section className="member-plans">
      <PlanOverview {...plans.overviewProps} />
      <WeeklyPlanner {...plans.plannerProps} />
      {plans.showSaveBar && <PlanSaveBar {...plans.saveBarProps} />}
      <PlanEditorModal {...plans.editorProps} />
    </section>
  );
}
