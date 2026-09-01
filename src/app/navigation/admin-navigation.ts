import { ClipboardCheck, House, Settings2, UsersRound } from 'lucide-react';
import { adminRoutes } from '../config/routes';
import type { WorkspaceNavigationItem } from './types';

export const adminNavigation: WorkspaceNavigationItem[] = [
  { end: true, icon: House, label: '홈', to: adminRoutes.home },
  { icon: UsersRound, label: '사원', to: adminRoutes.members },
  { icon: ClipboardCheck, label: '출석', to: adminRoutes.attendance },
  { icon: Settings2, label: '운영', to: adminRoutes.operations },
];
