import type { FormEvent } from 'react';
import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ApiRequestError } from '../../../core/api/api-client';
import { signup } from '../../../features/auth/auth-api';
import {
  buildSignupRequest,
  REGISTRATION_CODE_RECOVERY_MESSAGE,
  type VerifiedRegistration,
} from '../../../features/auth/registration-flow';
import { fetchBranches } from '../../../features/branches/branches-api';
import { Button, Field, Input } from '../../../shared/ui';
import { branchQueryKeys } from '../../../features/branches/branch-query-keys';

type PasswordPaneProps = {
  verified: VerifiedRegistration;
  onBackClick: () => void;
  onSignupComplete: (memberName: string, branchId: number) => void;
};

export function PasswordPane({
  verified,
  onBackClick,
  onSignupComplete,
}: PasswordPaneProps) {
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [formError, setFormError] = useState('');
  const [pending, setPending] = useState(false);
  const requestRef = useRef<AbortController | null>(null);
  const { member } = verified;

  useEffect(() => () => requestRef.current?.abort(), []);

  const branchesQuery = useQuery({
    queryFn: fetchBranches,
    queryKey: branchQueryKeys.all(),
    staleTime: 5 * 60 * 1000,
  });
  const branchName =
    branchesQuery.data?.find((branch) => branch.id === member.branchId)?.name ??
    `지점 ${member.branchId}`;

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (requestRef.current !== null) return;

    setFormError('');
    let request;
    try {
      request = buildSignupRequest(verified, password, passwordConfirm);
    } catch (error) {
      setFormError(
        error instanceof Error ? error.message : '입력 정보를 확인해 주세요.',
      );
      return;
    }

    const controller = new AbortController();
    requestRef.current = controller;
    setPending(true);

    try {
      const response = await signup(request, controller.signal);
      if (!controller.signal.aborted) {
        onSignupComplete(response.name, response.branchId);
      }
    } catch (error) {
      if (controller.signal.aborted) return;
      setFormError(
        verified.registrationCode !== undefined &&
          error instanceof ApiRequestError &&
          error.status === 404
          ? REGISTRATION_CODE_RECOVERY_MESSAGE
          : error instanceof ApiRequestError
            ? error.message
            : '가입 완료 여부를 확인하지 못했습니다. 로그인해 보거나 잠시 후 다시 시도해 주세요.',
      );
    } finally {
      if (!controller.signal.aborted) {
        requestRef.current = null;
        setPending(false);
      }
    }
  };

  return (
    <form className="auth-pane" onSubmit={(event) => void handleSubmit(event)}>
      <h2 className="auth-pane__title">비밀번호 설정</h2>
      <p className="auth-pane__subtitle">
        가입 정보를 확인하고 비밀번호를 설정해 주세요.
      </p>

      <dl className="auth-summary">
        <div>
          <dt>이름</dt>
          <dd>{member.name}</dd>
        </div>
        <div>
          <dt>지점</dt>
          <dd>{branchName}</dd>
        </div>
        <div>
          <dt>좌석</dt>
          <dd>{member.seatNumber ?? '미정'}</dd>
        </div>
        <div>
          <dt>입사 예정일</dt>
          <dd>{member.expectedJoinDate ?? '-'}</dd>
        </div>
      </dl>

      <Field label="비밀번호" required>
        {(id) => (
          <Input
            autoComplete="new-password"
            disabled={pending}
            id={id}
            inputMode="numeric"
            maxLength={4}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="사용하실 비밀번호 (4자리)"
            type="password"
            value={password}
          />
        )}
      </Field>

      <Field label="비밀번호 확인" required>
        {(id) => (
          <Input
            autoComplete="new-password"
            disabled={pending}
            id={id}
            inputMode="numeric"
            maxLength={4}
            onChange={(event) => setPasswordConfirm(event.target.value)}
            placeholder="비밀번호를 한 번 더 입력해 주세요"
            type="password"
            value={passwordConfirm}
          />
        )}
      </Field>

      {formError && (
        <p className="auth-pane__error" role="alert">
          {formError}
        </p>
      )}

      <Button full loading={pending} size="lg" type="submit">
        가입 완료
      </Button>

      <button
        className="auth-pane__switch"
        disabled={pending}
        onClick={onBackClick}
        type="button"
      >
        ‹ 등록 정보 다시 확인
      </button>
    </form>
  );
}
