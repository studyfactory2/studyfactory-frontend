import { apiRequest } from '../../core/api/api-client';

export type CertificationResponse = {
  id: number;
  /** The certificate's name — the backend calls this field `content`. */
  content: string;
  createdAt: string | null;
  updatedAt: string | null;
};

/** A shared reference list, like branches: not scoped to one member. */
export function fetchCertifications() {
  return apiRequest<CertificationResponse[]>('/api/certifications');
}
