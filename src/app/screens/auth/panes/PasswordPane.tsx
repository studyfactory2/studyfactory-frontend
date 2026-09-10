import type { FormEvent } from 'react';
import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { ApiRequestError } from '../../../core/api/api-client';
import {
  signup,
  type PreRegistrationVerifyResponse,
} from '../../../features/auth/auth-api';
import { fetchBranches } from '../../../features/branches/branches-api';
import { Button, Field, Input } from '../../../shared/ui';
import { branchQueryKeys } from '../../../features/branches/branch-query-keys';

type PasswordPaneProps = {
  member: PreRegistrationVerifyResponse;
  onBackClick: () => void;
  onSignupComplete: (memberName: string, branchId: number) => void;
};

export function PasswordPane({
  member,
  onBackClick,
  onSignupComplete,
}: PasswordPaneProps) {
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [formError, setFormError] = useState('');

  const branchesQuery = useQuery({
    queryFn: fetchBranches,
    queryKey: branchQueryKeys.all(),
    staleTime: 5 * 60 * 1000,
  });
  const branchName =
    branchesQuery.data?.find((branch) => branch.id === member.branchId)?.name ??
    `지점 ${member.branchId}`;

  const signupMutation = useMutation({
    mutationFn: signup,
    onSuccess: (response) => {
      onSignupComplete(response.name, response.branchId);
    },
    onError: (error) => {
      setFormError(
        error instanceof ApiRequestError
          ? error.message
          : '가입에 실패했습니다. 잠시 후 다시 시도해 주세요.',
      );
    },
  });

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();

    if (password.length !== 4 || !/^\d{4}$/.test(password)) {
      setFormError('비밀번호는 숫자 4자리로 입력해 주세요.');
      return;
    }

    if (password !== passwordConfirm) {
      setFormError('비밀번호가 서로 일치하지 않습니다.');
      return;
    }

    setFormError('');
    signupMutation.mutate({ memberId: member.memberId, password });
  };

  return (
    <form className="auth-pane" onSubmit={handleSubmit}>
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

      <Button full loading={signupMutation.isPending} size="lg" type="submit">
        가입 완료
      </Button>

      <button className="auth-pane__switch" onClick={onBackClick} type="button">
        ‹ 이전으로
      </button>
    </form>
  );
}
