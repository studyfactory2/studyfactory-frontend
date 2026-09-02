import { useCallback, useEffect, useRef, useState } from 'react';
import { Camera, ImageUp, QrCode, RotateCcw } from 'lucide-react';
import { Button, Modal } from '../../../../shared/ui';
import { extractStudyPresenceQrToken } from '../model/home.qr';
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
  const [scannerError, setScannerError] = useState<string | null>(null);

  const close = useCallback(() => {
    if (!loading) {
      setOpen(false);
    }
  }, [loading]);

  const openScanner = () => {
    onReset();
    setScannerError(null);
    setScannerAttempt((attempt) => attempt + 1);
    setOpen(true);
  };

  const submitResult = useCallback(
    async (rawValue: string) => {
      try {
        const qrToken = extractStudyPresenceQrToken(rawValue);
        setScannerError(null);
        await onSubmit(qrToken);
        setOpen(false);
      } catch (error) {
        if (error instanceof Error && !errorMessage) {
          setScannerError(error.message);
        }
      }
    },
    [errorMessage, onSubmit],
  );

  const retryScanner = () => {
    onReset();
    setScannerError(null);
    setScannerAttempt((attempt) => attempt + 1);
  };

  const isCheckIn = action === 'checkIn';

  return (
    <>
      <Button
        className="member-home__qr-trigger"
        onClick={openScanner}
        size="sm"
        variant="ghost"
      >
        <QrCode aria-hidden="true" size={17} />
        {isCheckIn ? 'QR로 입실하기' : 'QR로 퇴실하기'}
      </Button>

      <Modal
        onClose={close}
        open={open}
        size="sm"
        title={isCheckIn ? 'QR 입실 체크' : 'QR 퇴실 체크'}
      >
        <div className="member-home__qr-modal">
          <p className="member-home__qr-guide">
            출입구에 있는 자격증공장 QR을 화면 안에 맞춰 주세요.
          </p>

          <QrCamera
            key={scannerAttempt}
            onDetected={submitResult}
            onError={setScannerError}
          />

          {(scannerError ?? errorMessage) && (
            <div className="member-home__qr-error" role="alert">
              <p>{scannerError ?? errorMessage}</p>
              {!loading && (
                <Button onClick={retryScanner} size="sm" variant="ghost">
                  <RotateCcw aria-hidden="true" size={15} />
                  카메라 다시 켜기
                </Button>
              )}
            </div>
          )}

          {loading && (
            <p aria-live="polite" className="member-home__qr-processing">
              QR을 확인하고 있어요…
            </p>
          )}

          <QrImageUpload disabled={loading} onDetected={submitResult} />
          <p className="member-home__qr-security-note">
            로그인한 회원과 현재 지점이 서버에서 다시 확인됩니다.
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
  onDetected: (value: string) => Promise<void>;
  onError: (message: string) => void;
}) {
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

            detectedRef.current = true;
            activeControls.stop();
            void onDetectedRef.current(result.getText());
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
    <div className="member-home__qr-camera">
      <video
        aria-label="출입 QR 카메라 화면"
        muted
        playsInline
        ref={videoRef}
      />
      <span aria-hidden="true" className="member-home__qr-frame" />
      <span className="member-home__qr-camera-label">
        <Camera aria-hidden="true" size={14} />
        QR 자동 인식 중
      </span>
    </div>
  );
}

function QrImageUpload({
  disabled,
  onDetected,
}: {
  disabled: boolean;
  onDetected: (value: string) => Promise<void>;
}) {
  const [decoding, setDecoding] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const decodeFile = async (file: File) => {
    setDecoding(true);
    const imageUrl = URL.createObjectURL(file);

    try {
      const { BrowserQRCodeReader } = await import('@zxing/browser');
      const reader = new BrowserQRCodeReader();
      const result = await reader.decodeFromImageUrl(imageUrl);
      await onDetected(result.getText());
    } catch {
      await onDetected('');
    } finally {
      URL.revokeObjectURL(imageUrl);
      setDecoding(false);

      if (inputRef.current) {
        inputRef.current.value = '';
      }
    }
  };

  return (
    <div className="member-home__qr-upload">
      <input
        accept="image/*"
        capture="environment"
        disabled={disabled || decoding}
        onChange={(event) => {
          const file = event.currentTarget.files?.[0];

          if (file) {
            void decodeFile(file);
          }
        }}
        ref={inputRef}
        type="file"
      />
      <Button
        disabled={disabled || decoding}
        full
        onClick={() => inputRef.current?.click()}
        size="sm"
        variant="subtle"
      >
        <ImageUp aria-hidden="true" size={16} />
        {decoding ? '사진 확인 중…' : 'QR 사진으로 확인하기'}
      </Button>
    </div>
  );
}

function getCameraErrorMessage(error: unknown) {
  if (error instanceof DOMException && error.name === 'NotAllowedError') {
    return '카메라 권한이 필요해요. 권한을 허용하거나 QR 사진을 선택해 주세요.';
  }

  if (error instanceof DOMException && error.name === 'NotFoundError') {
    return '사용할 수 있는 카메라를 찾지 못했어요. QR 사진을 선택해 주세요.';
  }

  return '카메라를 시작하지 못했어요. QR 사진을 선택하거나 다시 시도해 주세요.';
}
