import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  QrCode,
  RotateCcw,
  ScanLine,
  ShieldCheck,
  VideoOff,
} from 'lucide-react';
import { Button, Modal, Spinner } from '../../../../shared/ui';
import { cx } from '../../../../shared/lib/cx';
import { parseStudyPresenceQrToken } from '../model/home.qr';
import '../styles/HomeQrPresence.css';

type HomeQrPresenceProps = {
  action: 'checkIn' | 'checkOut';
  errorMessage: string | null;
  loading: boolean;
  onReset: () => void;
  onSubmit: (qrToken: string) => Promise<unknown>;
};

export function HomeQrPresence({
  action,
  errorMessage,
  loading,
  onReset,
  onSubmit,
}: HomeQrPresenceProps) {
  const [open, setOpen] = useState(false);
  const [scannerAttempt, setScannerAttempt] = useState(0);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const isCheckIn = action === 'checkIn';

  const close = useCallback(() => {
    if (!loading) {
      setOpen(false);
    }
  }, [loading]);

  const restartScanner = useCallback(() => {
    onReset();
    setCameraError(null);
    setScannerAttempt((attempt) => attempt + 1);
  }, [onReset]);

  const openScanner = () => {
    restartScanner();
    setOpen(true);
  };

  const submitToken = useCallback(
    async (qrToken: string) => {
      try {
        await onSubmit(qrToken);
        setOpen(false);
      } catch {
        /*
         * The parent surfaces the failure through `errorMessage`. The camera
         * stays stopped so the member can read it before retrying.
         */
      }
    },
    [onSubmit],
  );

  const stateMessage = cameraError ?? errorMessage;

  return (
    <>
      <Button
        className="member-home__qr-trigger"
        onClick={openScanner}
        size="sm"
        variant="ghost"
      >
        <span className="member-home__qr-trigger-icon" aria-hidden="true">
          <QrCode size={14} />
        </span>
        <span>{isCheckIn ? 'QR로 입실하기' : 'QR로 퇴실하기'}</span>
      </Button>

      <Modal
        onClose={close}
        open={open}
        size="sm"
        title={isCheckIn ? '입실 체크' : '퇴실 체크'}
      >
        <div
          className={cx(
            'member-home__qr',
            isCheckIn ? 'member-home__qr--in' : 'member-home__qr--out',
          )}
        >
          <div
            className={cx(
              'member-home__qr-stage',
              cameraError !== null && 'is-blocked',
            )}
          >
            <span className="member-home__qr-mode">
              {isCheckIn ? '입실' : '퇴실'}
            </span>

            {cameraError === null ? (
              <QrCamera
                key={scannerAttempt}
                onDetected={submitToken}
                onError={setCameraError}
              />
            ) : (
              <div className="member-home__qr-stage-fallback">
                <VideoOff aria-hidden="true" size={26} />
                <p>카메라를 사용할 수 없어요</p>
              </div>
            )}

            {loading && (
              <div aria-live="polite" className="member-home__qr-stage-busy">
                <Spinner size="sm" />
                <p>QR을 확인하고 있어요…</p>
              </div>
            )}
          </div>

          {cameraError === null && (
            <div className="member-home__qr-copy">
              <p className="member-home__qr-instruction">
                출입문 QR을 사각형 안에 맞춰 주세요
              </p>
              <p className="member-home__qr-helper">
                {isCheckIn
                  ? '입실한 뒤부터 학습 시간이 기록돼요.'
                  : '퇴실한 뒤의 시간은 학습 시간에 포함되지 않아요.'}
              </p>
            </div>
          )}

          {stateMessage !== null && (
            <div className="member-home__qr-error" role="alert">
              <AlertCircle aria-hidden="true" size={16} />
              <p>{stateMessage}</p>
              {!loading && (
                <Button onClick={restartScanner} size="sm" variant="subtle">
                  <RotateCcw aria-hidden="true" size={14} />
                  다시 시도
                </Button>
              )}
            </div>
          )}

          <p className="member-home__qr-note">
            <ShieldCheck aria-hidden="true" size={14} />
            출입문 QR을 카메라로 직접 스캔해야 인정돼요. 카메라를 쓸 수 없다면
            데스크에 문의해 주세요.
          </p>
        </div>
      </Modal>
    </>
  );
}

function QrCamera({
  onDetected,
  onError,
}: {
  onDetected: (qrToken: string) => Promise<void>;
  onError: (message: string) => void;
}) {
  const [foreignCodeSeen, setForeignCodeSeen] = useState(false);
  const detectedRef = useRef(false);
  const onDetectedRef = useRef(onDetected);
  const onErrorRef = useRef(onError);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    onDetectedRef.current = onDetected;
    onErrorRef.current = onError;
  }, [onDetected, onError]);

  useEffect(() => {
    let cancelled = false;
    let scannerControls: { stop: () => void } | null = null;

    const startScanner = async () => {
      try {
        const { BrowserQRCodeReader } = await import('@zxing/browser');

        if (cancelled || !videoRef.current) {
          return;
        }

        const reader = new BrowserQRCodeReader(undefined, {
          delayBetweenScanAttempts: 250,
          delayBetweenScanSuccess: 1_000,
        });
        const controls = await reader.decodeFromConstraints(
          {
            audio: false,
            video: { facingMode: { ideal: 'environment' } },
          },
          videoRef.current,
          (result, _error, activeControls) => {
            if (!result || detectedRef.current) {
              return;
            }

            const qrToken = parseStudyPresenceQrToken(result.getText());

            if (qrToken === null) {
              /*
               * Someone else's QR drifted through the viewfinder. Keep the
               * camera running instead of stopping on a code we cannot use.
               */
              setForeignCodeSeen(true);
              return;
            }

            detectedRef.current = true;
            activeControls.stop();
            void onDetectedRef.current(qrToken);
          },
        );

        if (cancelled) {
          controls.stop();
          return;
        }

        scannerControls = controls;
      } catch (error) {
        if (!cancelled) {
          onErrorRef.current(getCameraErrorMessage(error));
        }
      }
    };

    void startScanner();

    return () => {
      cancelled = true;
      scannerControls?.stop();
    };
  }, []);

  return (
    <>
      <video
        aria-label="출입문 QR 카메라 화면"
        className="member-home__qr-video"
        muted
        playsInline
        ref={videoRef}
      />

      <span aria-hidden="true" className="member-home__qr-overlay">
        <span className="member-home__qr-frame" />
        <span className="member-home__qr-scan-line" />
      </span>

      <span
        aria-live="polite"
        className={cx(
          'member-home__qr-status',
          foreignCodeSeen && 'is-warning',
        )}
      >
        {foreignCodeSeen ? (
          <AlertCircle aria-hidden="true" size={13} />
        ) : (
          <ScanLine aria-hidden="true" size={13} />
        )}
        {foreignCodeSeen ? '자격증공장 출입 QR이 아니에요' : 'QR 자동 인식 중'}
      </span>
    </>
  );
}

function getCameraErrorMessage(error: unknown) {
  if (error instanceof DOMException) {
    if (error.name === 'NotAllowedError' || error.name === 'SecurityError') {
      return '카메라 접근이 차단돼 있어요. 브라우저 설정에서 이 사이트의 카메라를 허용한 뒤 다시 시도해 주세요.';
    }

    if (
      error.name === 'NotFoundError' ||
      error.name === 'OverconstrainedError'
    ) {
      return '사용할 수 있는 카메라를 찾지 못했어요. 데스크에 문의해 주세요.';
    }

    if (error.name === 'NotReadableError') {
      return '다른 앱이 카메라를 사용하고 있어요. 해당 앱을 닫고 다시 시도해 주세요.';
    }
  }

  return '카메라를 시작하지 못했어요. 잠시 후 다시 시도하거나 데스크에 문의해 주세요.';
}
