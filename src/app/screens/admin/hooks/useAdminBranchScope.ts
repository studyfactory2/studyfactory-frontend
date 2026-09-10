import { useOutletContext } from 'react-router-dom';
import type { BranchResponse } from '../../../features/branches/branches-api';

/**
 * The one branch every Admin screen operates on. AdminWorkspaceScreen owns it
 * and renders its child routes only once a concrete branch is resolved, so a
 * screen reading this context always has a real branch — never a fallback,
 * never "all branches". It is deliberately separate from core/session: the
 * authenticated branch is where the Admin belongs, this is where they are
 * working right now.
 */
export type AdminBranchScope = {
  branches: BranchResponse[];
  selectedBranch: BranchResponse;
  selectedBranchId: number;
  /** Ignores ids that are not in `branches`; nothing arbitrary can be chosen. */
  selectBranch: (branchId: number) => void;
};

export function useAdminBranchScope() {
  return useOutletContext<AdminBranchScope>();
}
