import { useState } from 'react';
import { ArrowLeft, CalendarDays, CalendarRange, Repeat2 } from 'lucide-react';
import type { SessionOwnerKey } from '../../../../core/session';
import {
  ManagerMemberLeaveView,
  type ManagerLeaveRouteContext,
} from '../../../../features/manager-leaves';
import { cx } from '../../../../shared/lib/cx';
import { AdminDailyLeaveOverview } from './AdminDailyLeaveOverview';
import { AdminFixedLeavePanel } from './AdminFixedLeavePanel';
import { useAdminDailyLeaves } from '../hooks/useAdminDailyLeaves';
import { useAdminFixedLeaves } from '../hooks/useAdminFixedLeaves';
import '../styles/admin-leave-management.css';

type AdminLeaveView = 'daily' | 'fixed' | 'member';

const ADMIN_LEAVE_VIEWS = [
  { icon: CalendarDays, label: '일별 현황', value: 'daily' },
  { icon: CalendarRange, label: '사원별 관리', value: 'member' },
  { icon: Repeat2, label: '고정 휴무', value: 'fixed' },
] as const;

type AdminLeaveWorkspaceProps = {
  branchId: number;
  branchName: string;
  directContext?: ManagerLeaveRouteContext;
  memberId: number;
  onExitDirect?: () => void;
  ownerKey: SessionOwnerKey;
};

export function AdminLeaveWorkspace(props: AdminLeaveWorkspaceProps) {
  const [view, setView] = useState<AdminLeaveView>('daily');
  const direct = props.directContext !== undefined;

  return (
    <section className="admin-leave-workspace">
      <div className="admin-leave-workspace__navigation">
        <div className="admin-leave-workspace__title">
          <span aria-hidden="true">
            <CalendarRange size={19} />
          </span>
          <div>
            <p>LEAVE DESK</p>
            <h2>휴무 관리</h2>
          </div>
        </div>

        {direct ? (
          <button
            className="admin-leave-workspace__exit"
            onClick={props.onExitDirect}
            type="button"
          >
            <ArrowLeft aria-hidden="true" size={16} />
            운영 전체 보기
          </button>
        ) : (
          <nav
            aria-label="휴무 관리 보기"
            className="admin-leave-workspace__tabs"
            role="tablist"
          >
            {ADMIN_LEAVE_VIEWS.map(({ icon: Icon, label, value }) => (
              <button
                aria-controls="admin-leave-panel"
                aria-selected={view === value}
                className={cx(view === value && 'is-active')}
                id={`admin-leave-tab-${value}`}
                key={value}
                onClick={() => setView(value)}
                role="tab"
                type="button"
              >
                <Icon aria-hidden="true" size={16} />
                {label}
              </button>
            ))}
          </nav>
        )}
      </div>

      <div
        aria-labelledby={direct ? undefined : `admin-leave-tab-${view}`}
        className="admin-leave-workspace__panel"
        id="admin-leave-panel"
        role={direct ? undefined : 'tabpanel'}
      >
        {direct ? (
          <ManagerMemberLeaveView
            branchId={props.branchId}
            context={props.directContext}
            memberId={props.memberId}
            ownerKey={props.ownerKey}
          />
        ) : (
          <>
            {view === 'daily' && <AdminDailyLeaveView {...props} />}
            {view === 'member' && <AdminMemberLeaveView {...props} />}
            {view === 'fixed' && <AdminFixedLeaveView {...props} />}
          </>
        )}
      </div>
    </section>
  );
}

function AdminDailyLeaveView(props: AdminLeaveWorkspaceProps) {
  const leaves = useAdminDailyLeaves(props);

  return (
    <AdminDailyLeaveOverview branchName={props.branchName} leaves={leaves} />
  );
}

function AdminMemberLeaveView(props: AdminLeaveWorkspaceProps) {
  return (
    <ManagerMemberLeaveView
      branchId={props.branchId}
      memberId={props.memberId}
      ownerKey={props.ownerKey}
    />
  );
}

function AdminFixedLeaveView(props: AdminLeaveWorkspaceProps) {
  const fixed = useAdminFixedLeaves(props);

  return <AdminFixedLeavePanel branchName={props.branchName} fixed={fixed} />;
}
