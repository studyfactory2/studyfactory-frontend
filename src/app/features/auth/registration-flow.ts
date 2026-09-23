import type {
  PreRegistrationVerifyRequest,
  PreRegistrationVerifyResponse,
  SignupRequest,
} from './auth-api';

export type RegistrationKind = 'member' | 'privileged';

/** Lives only in the signup screen and is discarded on back, exit or success. */
export type VerifiedRegistration = {
  member: PreRegistrationVerifyResponse;
  registrationCode?: string;
};

export function buildVerificationRequest(
  kind: RegistrationKind,
  name: string,
  branchId: string,
  registrationCode: string,
): PreRegistrationVerifyRequest {
  const parsedBranchId = Number(branchId);

  if (
    !name.trim() ||
    !Number.isSafeInteger(parsedBranchId) ||
    parsedBranchId <= 0
  ) {
    throw new Error('이름과 지점을 입력해 주세요.');
  }

  if (kind === 'privileged' && !/^\d{8}$/.test(registrationCode)) {
    throw new Error('관리자에게 받은 숫자 8자리 등록 코드를 입력해 주세요.');
  }

  return {
    branchId: parsedBranchId,
    name: name.trim(),
    ...(kind === 'privileged' ? { registrationCode } : {}),
  };
}

export function buildSignupRequest(
  verified: VerifiedRegistration,
  password: string,
  passwordConfirm: string,
): SignupRequest {
  if (!/^\d{4}$/.test(password)) {
    throw new Error('비밀번호는 숫자 4자리로 입력해 주세요.');
  }

  if (password !== passwordConfirm) {
    throw new Error('비밀번호가 서로 일치하지 않습니다.');
  }

  if (
    verified.registrationCode !== undefined &&
    !/^\d{8}$/.test(verified.registrationCode)
  ) {
    throw new Error('이전으로 돌아가 등록 코드를 다시 확인해 주세요.');
  }

  return {
    memberId: verified.member.memberId,
    password,
    ...(verified.registrationCode === undefined
      ? {}
      : { registrationCode: verified.registrationCode }),
  };
}

export const REGISTRATION_CODE_RECOVERY_MESSAGE =
  '이름·지점·등록 코드를 확인해 주세요. 코드가 만료되었거나 더 이상 사용할 수 없다면 관리자에게 새 코드를 요청한 뒤 다시 확인해 주세요.';
