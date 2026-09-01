import type { LucideIcon } from 'lucide-react';

export type WorkspaceNavigationItem = {
  end?: boolean;
  icon: LucideIcon;
  label: string;
  to: string;
};
