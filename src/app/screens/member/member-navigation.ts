import { BarChart3, CalendarDays, Ellipsis, House } from 'lucide-react';
import { memberRoutes } from '../../core/router/routes';
import type { WorkspaceNavigationItem } from '../../shared/layout/AppShell/types';

export const memberNavigation: WorkspaceNavigationItem[] = [
  { end: true, icon: House, label: '홈', to: memberRoutes.home },
  { icon: CalendarDays, label: '계획', to: memberRoutes.plans },
  { icon: BarChart3, label: '학습', to: memberRoutes.study },
  { icon: Ellipsis, label: '더보기', to: memberRoutes.more },
];
