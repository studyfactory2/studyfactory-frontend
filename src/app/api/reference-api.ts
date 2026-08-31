import { apiRequest } from './api-client';

export type BranchResponse = {
  id: number;
  name: string;
  address: string | null;
  createdAt: string;
  updatedAt: string;
};

export function fetchBranches() {
  return apiRequest<BranchResponse[]>('/api/branches');
}
