import { ClipboardCheck, Coffee, House, Settings2 } from 'lucide-react';
import { staffRoutes } from '../../core/router/routes';
import type { WorkspaceNavigationItem } from '../../shared/layout/AppShell/types';

export const staffNavigation: WorkspaceNavigationItem[] = [
  { end: true, icon: House, label: '홈', to: staffRoutes.home },
  { icon: ClipboardCheck, label: '출석', to: staffRoutes.attendance },
  { icon: Coffee, label: '음료', to: staffRoutes.beverages },
  { icon: Settings2, label: '운영', to: staffRoutes.operations },
];
