import type { FormEvent } from 'react';
import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
  ArrowRight,
  Building2,
  Eye,
  EyeOff,
  LockKeyhole,
  UserRound,
} from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ApiRequestError } from '../../../core/api/api-client';
import { fetchBranches } from '../../../features/branches/branches-api';
import { login } from '../../../features/auth/auth-api';
import { saveSession } from '../../../core/session';
import { InstallPrompt } from '../../../core/pwa/InstallPrompt';
import { Button, Field, Input, Select } from '../../../shared/ui';
import { getRoleHomePath } from '../../../core/router/routes';
import { branchQueryKeys } from '../../../features/branches/branch-query-keys';

type LoginPaneProps = {
  initialBranchId?: number;
  initialName?: string;
  onRegisterClick: () => void;
  onStaffRegisterClick: () => void;
};

const LAST_BRANCH_ID_KEY = 'studyfactory.lastBranchId';

export function LoginPane({
  initialBranchId,
  initialName = '',
  onRegisterClick,
  onStaffRegisterClick,
}: LoginPaneProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const [branchId, setBranchId] = useState(() =>
    initialBranchId ? String(initialBranchId) : readLastBranchId(),
  );
  const [name, setName] = useState(initialName);
  const [password, setPassword] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [formError, setFormError] = useState('');

  const branchesQuery = useQuery({
    queryFn: fetchBranches,
    queryKey: branchQueryKeys.all(),
    staleTime: 5 * 60 * 1000,
  });
  const resolvedBranchId = resolveBranchId(branchId, branchesQuery.data);

  const loginMutation = useMutation({
    mutationFn: login,
    onSuccess: (tokens) => {
      const nextSession = saveSession(tokens);

      if (!nextSession?.role) {
        setFormError('로그인 정보를 확인하지 못했습니다. 다시 시도해 주세요.');
        return;
      }

      window.localStorage.setItem(LAST_BRANCH_ID_KEY, resolvedBranchId);

      const from = (location.state as { from?: string } | null)?.from;
      navigate(from ?? getRoleHomePath(nextSession.role), { replace: true });
    },
    onError: (error) => {
      setFormError(
        error instanceof ApiRequestError && error.status === 401
          ? '지점, 이름 또는 비밀번호를 확인해 주세요.'
          : error instanceof ApiRequestError
            ? error.message
            : '로그인에 실패했습니다. 잠시 후 다시 시도해 주세요.',
      );
    },
  });

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();

    if (!resolvedBranchId || !name.trim() || !password) {
      setFormError('지점, 이름과 비밀번호를 모두 입력해 주세요.');
      return;
    }

    setFormError('');
    loginMutation.mutate({
      branchId: Number(resolvedBranchId),
      name: name.trim(),
      password,
    });
  };

  return (
    <form className="auth-pane" noValidate onSubmit={handleSubmit}>
      <header className="auth-pane__header">
        <p className="auth-pane__eyebrow">WELCOME BACK</p>
        <h2 className="auth-pane__title">오늘도 반가워요.</h2>
      </header>

      <Field label="지점" required>
        {(id) => (
          <div className="auth-control-wrap">
            <Building2 aria-hidden="true" size={19} />
            <Select
              disabled={branchesQuery.isPending || branchesQuery.isError}
              id={id}
              onChange={(event) => setBranchId(event.target.value)}
              required
              value={resolvedBranchId}
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
          </div>
        )}
      </Field>

      <Field label="이름" required>
        {(id) => (
          <div className="auth-control-wrap">
            <UserRound aria-hidden="true" size={19} />
            <Input
              autoComplete="username"
              id={id}
              onChange={(event) => setName(event.target.value)}
              placeholder="이름을 입력해 주세요"
              required
              value={name}
            />
          </div>
        )}
      </Field>

      <Field label="비밀번호" required>
        {(id) => (
          <div className="auth-control-wrap">
            <LockKeyhole aria-hidden="true" size={19} />
            <Input
              autoComplete="current-password"
              id={id}
              inputMode="numeric"
              maxLength={4}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="숫자 4자리"
              required
              type={passwordVisible ? 'text' : 'password'}
              value={password}
            />
            <button
              aria-label={
                passwordVisible ? '비밀번호 숨기기' : '비밀번호 표시하기'
              }
              className="auth-control-wrap__action"
              onClick={() => setPasswordVisible((visible) => !visible)}
              type="button"
            >
              {passwordVisible ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        )}
      </Field>

      <div aria-live="polite" className="auth-pane__status">
        {formError && (
          <p className="auth-pane__error" role="alert">
            {formError}
          </p>
        )}
      </div>

      <Button
        className="auth-pane__submit"
        full
        loading={loginMutation.isPending}
        size="lg"
        type="submit"
      >
        로그인 <ArrowRight aria-hidden="true" size={18} />
      </Button>

      <button
        className="auth-pane__switch"
        disabled={loginMutation.isPending}
        onClick={onRegisterClick}
        type="button"
      >
        처음 이용하시나요? <strong>사원등록</strong>
      </button>

      <button
        className="auth-pane__switch"
        disabled={loginMutation.isPending}
        onClick={onStaffRegisterClick}
        type="button"
      >
        등록 코드를 받으셨나요? <strong>스태프·관리자 등록</strong>
      </button>

      <InstallPrompt />
    </form>
  );
}

function readLastBranchId() {
  return typeof window === 'undefined'
    ? ''
    : (window.localStorage.getItem(LAST_BRANCH_ID_KEY) ?? '');
}

function resolveBranchId(
  branchId: string,
  branches: { id: number }[] | undefined,
) {
  if (!branches) {
    return branchId;
  }

  if (branches.some((branch) => String(branch.id) === branchId)) {
    return branchId;
  }

  return branches.length === 1 ? String(branches[0].id) : '';
}
