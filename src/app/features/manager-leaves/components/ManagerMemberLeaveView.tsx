import type { SessionOwnerKey } from '../../../core/session';
import type { ManagerLeaveRouteContext } from '../manager-leave-route';
import { useManagerMemberLeaves } from '../hooks/useManagerMemberLeaves';
import { ManagerMemberLeavePanel } from './ManagerMemberLeavePanel';

type ManagerMemberLeaveViewProps = {
  branchId: number;
  context?: ManagerLeaveRouteContext | null;
  memberId: number;
  ownerKey: SessionOwnerKey;
};

export function ManagerMemberLeaveView({
  branchId,
  context = null,
  memberId,
  ownerKey,
}: ManagerMemberLeaveViewProps) {
  const viewKey = context
    ? `${branchId}:${context.memberId}:${context.dateKey}:${context.slot}`
    : `${branchId}:browse`;

  return (
    <ManagerMemberLeaveSession
      branchId={branchId}
      context={context}
      key={viewKey}
      memberId={memberId}
      ownerKey={ownerKey}
    />
  );
}

function ManagerMemberLeaveSession({
  branchId,
  context,
  memberId,
  ownerKey,
}: ManagerMemberLeaveViewProps) {
  const leaves = useManagerMemberLeaves({
    branchId,
    initialDateKey: context?.dateKey ?? null,
    initialMemberId: context?.memberId ?? null,
    memberId,
    ownerKey,
  });

  return (
    <ManagerMemberLeavePanel
      initialDateKey={context?.dateKey ?? null}
      initialMemberId={context?.memberId ?? null}
      initialSlot={context?.slot ?? null}
      leaves={leaves}
    />
  );
}
