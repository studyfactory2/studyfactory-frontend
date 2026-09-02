import { useEffect, useMemo, useState } from 'react';
import { ChevronRight, MonitorDown, Share } from 'lucide-react';
import { Modal } from '../../shared/ui';
import './install-prompt.css';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
};

export function InstallPrompt() {
  const [installEvent, setInstallEvent] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [iosGuideOpen, setIosGuideOpen] = useState(false);
  const [message, setMessage] = useState('');

  const isStandalone = useMemo(() => {
    if (typeof window === 'undefined') {
      return false;
    }

    const iosNavigator = window.navigator as Navigator & {
      standalone?: boolean;
    };

    return (
      window.matchMedia('(display-mode: standalone)').matches ||
      iosNavigator.standalone === true
    );
  }, []);

  const isIos = useMemo(() => {
    if (typeof window === 'undefined') {
      return false;
    }

    return (
      /iphone|ipad|ipod/i.test(window.navigator.userAgent) ||
      (window.navigator.platform === 'MacIntel' &&
        window.navigator.maxTouchPoints > 1)
    );
  }, []);

  useEffect(() => {
    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallEvent(event as BeforeInstallPromptEvent);
    };

    const handleInstalled = () => {
      setInstalled(true);
      setInstallEvent(null);
      setMessage('홈 화면에 앱이 추가되었습니다.');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleInstalled);

    return () => {
      window.removeEventListener(
        'beforeinstallprompt',
        handleBeforeInstallPrompt,
      );
      window.removeEventListener('appinstalled', handleInstalled);
    };
  }, []);

  if (isStandalone || installed) {
    return message ? (
      <p className="install-prompt__message" role="status">
        {message}
      </p>
    ) : null;
  }

  const handleClick = async () => {
    if (isIos) {
      setIosGuideOpen(true);
      return;
    }

    if (!installEvent) {
      setMessage('브라우저 메뉴에서 설치 또는 홈 화면에 추가를 선택해 주세요.');
      return;
    }

    await installEvent.prompt();
    const choice = await installEvent.userChoice;

    if (choice.outcome === 'accepted') {
      setInstallEvent(null);
    }
  };

  return (
    <div className="install-prompt">
      <button
        className="install-prompt__button"
        onClick={handleClick}
        type="button"
      >
        <span className="install-prompt__button-icon">
          <MonitorDown aria-hidden="true" size={19} />
        </span>
        <span className="install-prompt__button-copy">
          <strong>앱으로 더 편하게</strong>
          <small>홈 화면에 설치하기</small>
        </span>
        <ChevronRight
          aria-hidden="true"
          className="install-prompt__button-arrow"
          size={18}
        />
      </button>
      {message && (
        <p className="install-prompt__message" role="status">
          {message}
        </p>
      )}

      <Modal
        onClose={() => setIosGuideOpen(false)}
        open={iosGuideOpen}
        size="sm"
        title="홈 화면에 추가하기"
      >
        <ol className="install-prompt__steps">
          <li>
            Safari에서 이 페이지를 열고, 도구 막대의{' '}
            <Share className="install-prompt__icon" size={15} />{' '}
            <strong>공유</strong> 버튼을 눌러 주세요.
          </li>
          <li>
            <strong>홈 화면에 추가</strong>를 선택해 주세요.
          </li>
          <li>
            오른쪽 위의 <strong>추가</strong>를 누르면 완료됩니다.
          </li>
        </ol>
      </Modal>
    </div>
  );
}
