import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import type { PreRegistrationVerifyResponse } from '../../auth/auth-api';
import { useSession } from '../../auth/session';
import { FactoryScene } from '../../components/illustrations/FactoryScene';
import { useToast } from '../../components/ui';
import { getRoleHomePath } from '../../config/routes';
import { cx } from '../../lib/cx';
import { LoginPane } from './panes/LoginPane';
import { PasswordPane } from './panes/PasswordPane';
import { VerifyPane } from './panes/VerifyPane';
import './auth-screen.css';

type AuthMode = 'login' | 'verify' | 'password';

export function AuthScreen() {
  const session = useSession();
  const { toast } = useToast();
  const [mode, setMode] = useState<AuthMode>('login');
  const [verifiedMember, setVerifiedMember] =
    useState<PreRegistrationVerifyResponse | null>(null);
  const [prefillName, setPrefillName] = useState('');
  const [prefillBranchId, setPrefillBranchId] = useState<number>();

  if (session.accessToken && session.role) {
    return <Navigate replace to={getRoleHomePath(session.role)} />;
  }

  const isRegister = mode !== 'login';

  const openLogin = () => {
    setMode('login');
    setVerifiedMember(null);
  };

  const openVerify = () => {
    setMode('verify');
    setVerifiedMember(null);
  };

  const handleVerified = (member: PreRegistrationVerifyResponse) => {
    setVerifiedMember(member);
    setMode('password');
  };

  const handleSignupComplete = (memberName: string, branchId: number) => {
    toast('가입이 완료되었습니다. 로그인해 주세요.', 'success');
    setPrefillName(memberName);
    setPrefillBranchId(branchId);
    openLogin();
  };

  return (
    <main className={cx('auth-screen', isRegister && 'auth-screen--register')}>
      <div className="auth-screen__stage">
        <aside className="auth-story">
          <span
            aria-hidden="true"
            className="auth-story__orb auth-story__orb--1"
          />
          <span
            aria-hidden="true"
            className="auth-story__orb auth-story__orb--2"
          />

          <div className="auth-brand auth-brand--light">
            <span className="auth-brand__mark">
              <img alt="" src="/favicon.png" />
            </span>
            <span className="auth-brand__name">
              <strong>STUDY FACTORY</strong>
              <small>학습 운영 시스템</small>
            </span>
          </div>

          <div className="auth-story__copy">
            <p className="auth-story__eyebrow">YOUR FOCUS, ORGANISED</p>
            <h1>
              다시,
              <span>집중의 자리로.</span>
            </h1>
            <p className="auth-story__description">
              출석부터 학습 계획과 운영 기록까지. 스터디팩토리의 하루를 한곳에서
              이어가세요.
            </p>
          </div>

          <div aria-hidden="true" className="auth-story__scene">
            <span className="auth-story__scene-grid" />

            <div className="auth-story__rhythm">
              <small>TODAY&apos;S RHYTHM</small>
              <strong>차분하게 시작해요</strong>
              <div className="auth-story__rhythm-track">
                <i />
                <i />
                <i />
                <i />
              </div>
              <span>입실 · 계획 · 집중 · 기록</span>
            </div>

            <div className="auth-story__factory">
              <FactoryScene />
            </div>

            <div className="auth-story__mascot">
              <img alt="" src="/brand/studyfactory-character.png" />
              <span>
                <small>READY</small>
                <strong>오늘도 준비 완료</strong>
              </span>
            </div>
          </div>

          <footer className="auth-story__footer">
            <span>BUSAN · STUDY FACTORY</span>
            <span>
              <ShieldCheck size={15} /> 회원 전용 서비스
            </span>
          </footer>
        </aside>

        <section className="auth-panel">
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
            본 서비스는 스터디팩토리 등록 회원 전용입니다.
          </p>
        </section>
      </div>
    </main>
  );
}
