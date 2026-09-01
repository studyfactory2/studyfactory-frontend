import type { FocusEvent } from 'react';
import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import type { PreRegistrationVerifyResponse } from '../../auth/auth-api';
import { useSession } from '../../auth/session';
import { useToast } from '../../components/ui';
import { getRoleHomePath } from '../../config/routes';
import { LoginPane } from './panes/LoginPane';
import { PasswordPane } from './panes/PasswordPane';
import { VerifyPane } from './panes/VerifyPane';
import './auth-screen.css';

type AuthMode = 'login' | 'verify' | 'password';

const AUTH_VISUAL_STEPS: Record<AuthMode, string[]> = {
  login: ['지점.', '이름.', '시작.'],
  password: ['시작.', '확인.'],
  verify: ['이름.', '지점.'],
};

export function AuthScreen() {
  const session = useSession();
  const { toast } = useToast();
  const [mode, setMode] = useState<AuthMode>('login');
  const [verifiedMember, setVerifiedMember] =
    useState<PreRegistrationVerifyResponse | null>(null);
  const [prefillName, setPrefillName] = useState('');
  const [prefillBranchId, setPrefillBranchId] = useState<number>();
  const [focusedFieldIndex, setFocusedFieldIndex] = useState(0);

  if (session.accessToken && session.role) {
    return <Navigate replace to={getRoleHomePath(session.role)} />;
  }

  const openLogin = () => {
    setMode('login');
    setVerifiedMember(null);
    setFocusedFieldIndex(0);
  };

  const openVerify = () => {
    setMode('verify');
    setVerifiedMember(null);
    setFocusedFieldIndex(0);
  };

  const handleVerified = (member: PreRegistrationVerifyResponse) => {
    setVerifiedMember(member);
    setMode('password');
    setFocusedFieldIndex(0);
  };

  const handleSignupComplete = (memberName: string, branchId: number) => {
    toast('가입이 완료되었습니다. 로그인해 주세요.', 'success');
    setPrefillName(memberName);
    setPrefillBranchId(branchId);
    openLogin();
  };

  const visualSteps = AUTH_VISUAL_STEPS[mode];
  const activeVisualStep = Math.min(focusedFieldIndex, visualSteps.length - 1);

  const handlePanelFocus = (event: FocusEvent<HTMLElement>) => {
    const target = event.target as HTMLElement;
    const field = target.closest<HTMLElement>('.field');

    if (!field) {
      return;
    }

    const fields = Array.from(
      event.currentTarget.querySelectorAll<HTMLElement>('.field'),
    );
    const nextIndex = fields.indexOf(field);

    if (nextIndex >= 0) {
      setFocusedFieldIndex(nextIndex);
    }
  };

  return (
    <main className="auth-screen">
      <div aria-hidden="true" className="auth-atmosphere">
        <span className="auth-atmosphere__number">
          {String(activeVisualStep + 1).padStart(2, '0')}
        </span>
        <strong
          className="auth-atmosphere__word"
          key={`${mode}-${activeVisualStep}`}
        >
          {visualSteps[activeVisualStep]}
        </strong>
        <span className="auth-atmosphere__caption">PLAN · FOCUS · RECORD</span>
      </div>

      <div className="auth-screen__stage">
        <section className="auth-panel" onFocusCapture={handlePanelFocus}>
          <div className="auth-panel__topline">
            <span>자격증공장</span>
            <span>MEMBER ACCESS</span>
          </div>

          <div aria-hidden="true" className="auth-rhythm">
            {visualSteps.map((step, index) => (
              <span
                className={index <= activeVisualStep ? 'is-active' : undefined}
                key={step}
              />
            ))}
          </div>

          <div className="auth-panel__content" key={mode}>
            {mode === 'login' ? (
              <LoginPane
                initialBranchId={prefillBranchId}
                initialName={prefillName}
                key={`login-${prefillBranchId ?? 'none'}-${prefillName}`}
                onRegisterClick={openVerify}
              />
            ) : mode === 'password' && verifiedMember ? (
              <PasswordPane
                key="password"
                member={verifiedMember}
                onBackClick={openVerify}
                onSignupComplete={handleSignupComplete}
              />
            ) : (
              <VerifyPane
                key="verify"
                onLoginClick={openLogin}
                onVerified={handleVerified}
              />
            )}
          </div>

          <p className="auth-panel__privacy">
            본 서비스는 자격증공장 등록 회원 전용입니다.
          </p>
        </section>
      </div>
    </main>
  );
}
