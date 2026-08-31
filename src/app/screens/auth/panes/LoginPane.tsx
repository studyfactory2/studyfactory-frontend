import type { FormEvent } from 'react';
import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useLocation, useNavigate } from 'react-router-dom';
import { ApiRequestError } from '../../../api/api-client';
import { login } from '../../../auth/auth-api';
import { decodeAccessToken } from '../../../auth/jwt';
import { saveSession } from '../../../auth/session';
import { InstallPrompt } from '../../../components/pwa/InstallPrompt';
import { Button, Field, Input } from '../../../components/ui';
import { getRoleHomePath } from '../../../config/routes';

type LoginPaneProps = {
  initialName?: string;
  onRegisterClick: () => void;
};

export function LoginPane({
  initialName = '',
  onRegisterClick,
}: LoginPaneProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const [name, setName] = useState(initialName);
  const [password, setPassword] = useState('');
  const [formError, setFormError] = useState('');

  const loginMutation = useMutation({
    mutationFn: login,
    onSuccess: (tokens) => {
      const payload = decodeAccessToken(tokens.accessToken);

      if (!payload.role) {
        setFormError('로그인 정보를 확인하지 못했습니다. 다시 시도해 주세요.');
        return;
      }

      saveSession({
        accessToken: tokens.accessToken,
        memberName: payload.name,
        refreshToken: tokens.refreshToken,
        role: payload.role,
      });

      const from = (location.state as { from?: string } | null)?.from;
      navigate(from ?? getRoleHomePath(payload.role), { replace: true });
    },
    onError: (error) => {
      setFormError(
        error instanceof ApiRequestError
          ? error.message
          : '로그인에 실패했습니다. 잠시 후 다시 시도해 주세요.',
      );
    },
  });

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();

    if (!name.trim() || !password) {
      setFormError('이름과 비밀번호를 입력해 주세요.');
      return;
    }

    setFormError('');
    loginMutation.mutate({ name: name.trim(), password });
  };

  return (
    <form className="auth-pane" onSubmit={handleSubmit}>
      <h2 className="auth-pane__title">오늘도 반가워요!</h2>
      <p className="auth-pane__subtitle">차분하게, 집중하는 하루를 시작해요.</p>

      <Field label="이름" required>
        {(id) => (
          <Input
            autoComplete="username"
            id={id}
            onChange={(event) => setName(event.target.value)}
            placeholder="이름 (예: 김공장)"
            value={name}
          />
        )}
      </Field>

      <Field label="비밀번호" required>
        {(id) => (
          <Input
            autoComplete="current-password"
            id={id}
            inputMode="numeric"
            maxLength={4}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="비밀번호 (4자리)"
            type="password"
            value={password}
          />
        )}
      </Field>

      {formError && (
        <p className="auth-pane__error" role="alert">
          {formError}
        </p>
      )}

      <Button full loading={loginMutation.isPending} size="lg" type="submit">
        로그인
      </Button>

      <button
        className="auth-pane__switch"
        onClick={onRegisterClick}
        type="button"
      >
        처음이신가요? <strong>사원등록</strong>
      </button>

      <InstallPrompt />
    </form>
  );
}
