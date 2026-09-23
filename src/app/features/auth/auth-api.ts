import { apiRequest, ApiRequestError } from '../../core/api/api-client';

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
  registrationCode?: string;
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
  registrationCode?: string;
};

export type SignupResponse = {
  id: number;
  branchId: number;
  name: string;
  role: string;
  seatNumber: number | null;
  joinDate: string | null;
};

export async function verifyPreRegistration(
  request: PreRegistrationVerifyRequest,
  signal?: AbortSignal,
) {
  const members = await apiRequest<PreRegistrationVerifyResponse[]>(
    '/api/members/pre-registration/verify',
    { body: JSON.stringify(request), method: 'POST', signal },
  );

  if (
    members.some(
      (member) =>
        member.branchId !== request.branchId || member.name !== request.name,
    )
  ) {
    throw new ApiRequestError('요청한 사전등록 정보와 응답이 다릅니다.', 409);
  }

  return members;
}

export function signup(request: SignupRequest, signal?: AbortSignal) {
  return apiRequest<SignupResponse>('/api/members/signup', {
    body: JSON.stringify(request),
    method: 'POST',
    signal,
  });
}
