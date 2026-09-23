import type { FormEvent } from 'react';
import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ApiRequestError } from '../../../core/api/api-client';
import { verifyPreRegistration } from '../../../features/auth/auth-api';
import {
  buildVerificationRequest,
  REGISTRATION_CODE_RECOVERY_MESSAGE,
  type RegistrationKind,
  type VerifiedRegistration,
} from '../../../features/auth/registration-flow';
import { fetchBranches } from '../../../features/branches/branches-api';
import { Button, Field, Input, Select } from '../../../shared/ui';
import { branchQueryKeys } from '../../../features/branches/branch-query-keys';

type VerifyPaneProps = {
  kind: RegistrationKind;
  onLoginClick: () => void;
  onVerified: (registration: VerifiedRegistration) => void;
};

export function VerifyPane({
  kind,
  onLoginClick,
  onVerified,
}: VerifyPaneProps) {
  const [name, setName] = useState('');
  const [branchId, setBranchId] = useState('');
  const [registrationCode, setRegistrationCode] = useState('');
  const [formError, setFormError] = useState('');
  const [candidates, setCandidates] = useState<VerifiedRegistration[]>([]);
  const [pending, setPending] = useState(false);
  const requestRef = useRef<AbortController | null>(null);
  const privileged = kind === 'privileged';

  useEffect(() => () => requestRef.current?.abort(), []);

  const branchesQuery = useQuery({
    queryFn: fetchBranches,
    queryKey: branchQueryKeys.all(),
    staleTime: 5 * 60 * 1000,
  });

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (requestRef.current !== null) return;

    setFormError('');
    setCandidates([]);

    let request;
    try {
      request = buildVerificationRequest(
        kind,
        name,
        branchId,
        registrationCode,
      );
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
      const members = await verifyPreRegistration(request, controller.signal);
      if (controller.signal.aborted) return;

      if (members.length === 0) {
        setFormError(
          privileged
            ? REGISTRATION_CODE_RECOVERY_MESSAGE
            : '등록된 정보를 찾지 못했습니다. 이름과 지점을 확인해 주세요.',
        );
        return;
      }

      const verified = members.map((member) => ({
        member,
        ...(request.registrationCode === undefined
          ? {}
          : { registrationCode: request.registrationCode }),
      }));

      if (members.length === 1) {
        onVerified(verified[0]);
        return;
      }

      setCandidates(verified);
    } catch (error) {
      if (controller.signal.aborted) return;
      setFormError(
        privileged && error instanceof ApiRequestError && error.status === 404
          ? REGISTRATION_CODE_RECOVERY_MESSAGE
          : error instanceof ApiRequestError
            ? error.message
            : '등록 정보 확인에 실패했습니다. 잠시 후 다시 시도해 주세요.',
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
      <h2 className="auth-pane__title">
        {privileged ? '스태프·관리자 등록' : '사원등록'}
      </h2>
      <p className="auth-pane__subtitle">
        {privileged
          ? '사전 등록된 이름·지점과 관리자에게 받은 등록 코드로 확인해요.'
          : '사전 등록된 이름과 지점으로 가입 정보를 확인해요.'}
      </p>

      <Field label="이름" required>
        {(id) => (
          <Input
            autoComplete="name"
            disabled={pending}
            id={id}
            onChange={(event) => {
              setName(event.target.value);
              setCandidates([]);
              setFormError('');
            }}
            placeholder="이름을 입력해 주세요"
            value={name}
          />
        )}
      </Field>

      <Field label="지점" required>
        {(id) => (
          <Select
            disabled={
              pending || branchesQuery.isPending || branchesQuery.isError
            }
            id={id}
            onChange={(event) => {
              setBranchId(event.target.value);
              setCandidates([]);
              setFormError('');
            }}
            value={branchId}
          >
            <option disabled value="">
              {branchesQuery.isPending
                ? '지점 목록을 불러오는 중...'
                : branchesQuery.isError
                  ? '지점 목록을 불러오지 못했습니다'
                  : '지점을 선택해 주세요'}
            </option>
            {(branchesQuery.data ?? []).map((branch) => (
              <option key={branch.id} value={branch.id}>
                {branch.name}
              </option>
            ))}
          </Select>
        )}
      </Field>

      {privileged && (
        <Field
          label="등록 코드"
          hint="관리자에게 받은 8자리 코드예요. 로그인 비밀번호는 다음 단계에서 직접 설정해요."
          required
        >
          {(id) => (
            <Input
              autoComplete="one-time-code"
              disabled={pending}
              id={id}
              inputMode="numeric"
              maxLength={8}
              onChange={(event) => {
                setRegistrationCode(event.target.value.replace(/[^0-9]/g, ''));
                setCandidates([]);
                setFormError('');
              }}
              placeholder="숫자 8자리 등록 코드"
              value={registrationCode}
            />
          )}
        </Field>
      )}

      {formError && (
        <p className="auth-pane__error" role="alert">
          {formError}
        </p>
      )}

      <Button full loading={pending} size="lg" type="submit">
        확인
      </Button>

      {candidates.length > 1 && (
        <div className="auth-candidates">
          <strong className="auth-candidates__title">가입할 사원 선택</strong>
          {candidates.map((verified) => (
            <button
              className="auth-candidates__card"
              disabled={pending}
              key={verified.member.memberId}
              onClick={() => onVerified(verified)}
              type="button"
            >
              <span>{verified.member.name}</span>
              <small>
                좌석 {verified.member.seatNumber ?? '미정'} · 입사 예정일{' '}
                {verified.member.expectedJoinDate ?? '-'}
              </small>
            </button>
          ))}
        </div>
      )}

      <button
        className="auth-pane__switch"
        onClick={onLoginClick}
        type="button"
      >
        이미 계정이 있나요? <strong>로그인</strong>
      </button>
    </form>
  );
}
