import { apiRequest } from '../api/api-client';

export type LoginRequest = {
  branchId: number;
  name: string;
  password: string;
};

export type LoginResponse = {
  accessToken: string;
  refreshToken: string;
};

export function login(request: LoginRequest) {
  return apiRequest<LoginResponse>('/api/auth/login', {
    body: JSON.stringify(request),
    method: 'POST',
  });
}

export type PreRegistrationVerifyRequest = {
  branchId: number;
  name: string;
};

export type PreRegistrationVerifyResponse = {
  memberId: number;
  branchId: number;
  name: string;
  seatNumber: number | null;
  expectedJoinDate: string | null;
  certificationId: number | null;
  drinkSetting: string | null;
  drinkNotes: Record<string, string> | null;
};

export type SignupRequest = {
  memberId: number;
  password: string;
};

export type SignupResponse = {
  id: number;
  branchId: number;
  name: string;
  role: string;
  seatNumber: number | null;
  joinDate: string | null;
};

export function verifyPreRegistration(request: PreRegistrationVerifyRequest) {
  return apiRequest<PreRegistrationVerifyResponse[]>(
    '/api/members/pre-registration/verify',
    { body: JSON.stringify(request), method: 'POST' },
  );
}

export function signup(request: SignupRequest) {
  return apiRequest<SignupResponse>('/api/members/signup', {
    body: JSON.stringify(request),
    method: 'POST',
  });
}
