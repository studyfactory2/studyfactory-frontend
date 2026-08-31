import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Factory } from 'lucide-react';
import type { PreRegistrationVerifyResponse } from '../../auth/auth-api';
import { useSession } from '../../auth/session';
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

  const handleSignupComplete = (memberName: string) => {
    toast('가입이 완료되었습니다. 로그인해 주세요.', 'success');
    setPrefillName(memberName);
    openLogin();
  };

  return (
    <main className={cx('auth-screen', isRegister && 'auth-screen--register')}>
      <div className="auth-screen__stage">
        <section
          aria-hidden={!isRegister}
          className="auth-screen__zone auth-screen__zone--register"
        >
          {mode === 'password' && verifiedMember ? (
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
        </section>

        <section
          aria-hidden={isRegister}
          className="auth-screen__zone auth-screen__zone--login"
        >
          <LoginPane
            initialName={prefillName}
            key={`login-${prefillName}`}
            onRegisterClick={openVerify}
          />
        </section>

        <aside aria-hidden="true" className="auth-overlay">
          <i className="auth-overlay__bubble auth-overlay__bubble--1" />
          <i className="auth-overlay__bubble auth-overlay__bubble--2" />
          <i className="auth-overlay__bubble auth-overlay__bubble--3" />

          <div className="auth-overlay__content">
            <p className="auth-overlay__brand">
              <span className="auth-overlay__brand-mark">
                <Factory size={20} />
              </span>
              STUDY FACTORY
            </p>

            <div className="auth-overlay__copy">
              {isRegister ? (
                <>
                  <h1>다시 만나 반가워요!</h1>
                  <p>이미 계정이 있다면 바로 로그인하세요.</p>
                  <button
                    className="auth-overlay__switch"
                    onClick={openLogin}
                    tabIndex={-1}
                    type="button"
                  >
                    로그인 하기
                  </button>
                </>
              ) : (
                <>
                  <h1>처음 오셨나요?</h1>
                  <p>사전 등록된 정보로 간단하게 가입할 수 있어요.</p>
                  <button
                    className="auth-overlay__switch"
                    onClick={openVerify}
                    tabIndex={-1}
                    type="button"
                  >
                    사원등록 하기
                  </button>
                </>
              )}
            </div>

            <div className="auth-overlay__character">
              <img alt="" src="/brand/studyfactory-character.png" />
            </div>
          </div>
        </aside>

        <div aria-hidden="true" className="auth-blob">
          <span className="auth-blob__bubbles">
            <i className="auth-blob__bubble auth-blob__bubble--1" />
            <i className="auth-blob__bubble auth-blob__bubble--2" />
          </span>

          <p className="auth-blob__brand">
            <Factory size={15} />
            STUDY FACTORY
          </p>

          <div className="auth-blob__copy">
            <h2>
              {isRegister ? (
                <>
                  처음 오셨나요?
                  <br />
                  환영합니다!
                </>
              ) : (
                <>
                  다시 만나
                  <br />
                  반가워요!
                </>
              )}
            </h2>
            <p>오늘도 집중하는 하루를 시작해요</p>
          </div>

          <div className="auth-blob__char">
            <img alt="" src="/brand/studyfactory-character.png" />
          </div>

          <svg
            className="auth-blob__wave"
            preserveAspectRatio="none"
            viewBox="0 0 360 74"
          >
            <path
              d="M0 26C50 64 120 74 190 56 260 38 320 44 360 66V74H0Z"
              fill="var(--wash)"
            />
            <path
              d="M0 26C50 64 120 74 190 56 260 38 320 44 360 66"
              fill="none"
              stroke="rgb(255 253 248 / 35%)"
              strokeWidth="3"
            />
          </svg>
        </div>
      </div>
    </main>
  );
}
