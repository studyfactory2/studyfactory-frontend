import type { FormEvent } from 'react';
import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { ApiRequestError } from '../../../core/api/api-client';
import {
  verifyPreRegistration,
  type PreRegistrationVerifyResponse,
} from '../../../auth/auth-api';
import { fetchBranches } from '../../../api/reference-api';
import { Button, Field, Input, Select } from '../../../components/ui';
import { branchQueryKeys } from '../../../shared/branches/branch-query-keys';

type VerifyPaneProps = {
  onLoginClick: () => void;
  onVerified: (member: PreRegistrationVerifyResponse) => void;
};

export function VerifyPane({ onLoginClick, onVerified }: VerifyPaneProps) {
  const [name, setName] = useState('');
  const [branchId, setBranchId] = useState('');
  const [formError, setFormError] = useState('');
  const [candidates, setCandidates] = useState<PreRegistrationVerifyResponse[]>(
    [],
  );

  const branchesQuery = useQuery({
    queryFn: fetchBranches,
    queryKey: branchQueryKeys.all(),
    staleTime: 5 * 60 * 1000,
  });

  const verifyMutation = useMutation({
    mutationFn: verifyPreRegistration,
    onSuccess: (members) => {
      if (members.length === 0) {
        setFormError(
          '등록된 정보를 찾지 못했습니다. 이름과 지점을 확인해 주세요.',
        );
        return;
      }

      if (members.length === 1) {
        onVerified(members[0]);
        return;
      }

      setCandidates(members);
    },
    onError: (error) => {
      setCandidates([]);
      setFormError(
        error instanceof ApiRequestError
          ? error.message
          : '등록 정보 확인에 실패했습니다. 잠시 후 다시 시도해 주세요.',
      );
    },
  });

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();

    if (!name.trim() || !branchId) {
      setFormError('이름과 지점을 입력해 주세요.');
      return;
    }

    setFormError('');
    setCandidates([]);
    verifyMutation.mutate({ branchId: Number(branchId), name: name.trim() });
  };

  return (
    <form className="auth-pane" onSubmit={handleSubmit}>
      <h2 className="auth-pane__title">사원등록</h2>
      <p className="auth-pane__subtitle">
        사전 등록된 이름과 지점으로 가입 정보를 확인해요.
      </p>

      <Field label="이름" required>
        {(id) => (
          <Input
            autoComplete="name"
            id={id}
            onChange={(event) => setName(event.target.value)}
            placeholder="이름을 입력해 주세요"
            value={name}
          />
        )}
      </Field>

      <Field label="지점" required>
        {(id) => (
          <Select
            disabled={branchesQuery.isPending || branchesQuery.isError}
            id={id}
            onChange={(event) => setBranchId(event.target.value)}
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

      {formError && (
        <p className="auth-pane__error" role="alert">
          {formError}
        </p>
      )}

      <Button full loading={verifyMutation.isPending} size="lg" type="submit">
        확인
      </Button>

      {candidates.length > 1 && (
        <div className="auth-candidates">
          <strong className="auth-candidates__title">가입할 사원 선택</strong>
          {candidates.map((member) => (
            <button
              className="auth-candidates__card"
              key={member.memberId}
              onClick={() => onVerified(member)}
              type="button"
            >
              <span>{member.name}</span>
              <small>
                좌석 {member.seatNumber ?? '미정'} · 입사예정일{' '}
                {member.expectedJoinDate ?? '-'}
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
