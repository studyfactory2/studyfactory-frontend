import { useCallback, useRef, useState } from 'react';
import {
  Download,
  Expand,
  Printer,
  QrCode,
  RefreshCw,
  ShieldCheck,
  Smartphone,
} from 'lucide-react';
import {
  Badge,
  Button,
  Card,
  Modal,
  SectionError,
  SectionLoading,
  useToast,
} from '../../../../shared/ui';
import { cx } from '../../../../shared/lib/cx';
import type { AdminDoorQrState } from '../hooks/useAdminDoorQr';
import { DoorQrCode } from './DoorQrCode';
import '../styles/admin-door-qr.css';

type AdminDoorQrPanelProps = {
  branchName: string;
  doorQr: AdminDoorQrState;
};

export function AdminDoorQrPanel({
  branchName,
  doorQr,
}: AdminDoorQrPanelProps) {
  const [largeViewOpen, setLargeViewOpen] = useState(false);
  const [qrReady, setQrReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const qrSvgRef = useRef<SVGSVGElement | null>(null);
  const { toast } = useToast();

  const handleQrReady = useCallback((svg: SVGSVGElement | null) => {
    qrSvgRef.current = svg;
    setQrReady(svg !== null);
  }, []);

  const handleDownload = async () => {
    const svg = qrSvgRef.current;

    if (svg === null) {
      toast('QR 이미지가 준비된 후 다시 시도해 주세요.', 'error');
      return;
    }

    setSaving(true);

    try {
      await downloadQrPng(svg, branchName);
      toast('출입 QR 이미지를 저장했어요.', 'success');
    } catch {
      toast('QR 이미지를 저장하지 못했어요.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const ready = doorQr.qrToken !== null && qrReady;

  return (
    <Card className="admin-door-qr" padding="none">
      <header className="admin-door-qr__header">
        <div className="admin-door-qr__heading">
          <span aria-hidden="true" className="admin-door-qr__heading-icon">
            <QrCode size={19} />
          </span>
          <div>
            <h3>출입 QR</h3>
            <p>회원 입실·퇴실을 위한 지점 전용 QR이에요.</p>
          </div>
        </div>
        {doorQr.qrToken !== null ? (
          <div className="admin-door-qr__header-actions">
            <Badge dot tone="positive">
              고정 QR
            </Badge>
            <button
              aria-busy={doorQr.refreshing}
              aria-label="출입 QR 새로고침"
              className={cx(
                'admin-door-qr__refresh',
                doorQr.refreshing && 'is-refreshing',
              )}
              disabled={doorQr.refreshing}
              onClick={doorQr.onRefresh}
              type="button"
            >
              <RefreshCw aria-hidden="true" size={16} />
              <span>새로고침</span>
            </button>
          </div>
        ) : null}
      </header>

      <div
        aria-busy={doorQr.loading || doorQr.refreshing}
        className="admin-door-qr__body"
      >
        {doorQr.loading ? (
          <SectionLoading label="출입 QR을 불러오는 중이에요." />
        ) : doorQr.errorMessage !== null ? (
          <SectionError
            message={doorQr.errorMessage}
            onRetry={doorQr.onRetry}
          />
        ) : doorQr.qrToken === null ? (
          <SectionError
            message="출입 QR 정보를 확인하지 못했어요."
            onRetry={doorQr.onRetry}
          />
        ) : (
          <div className="admin-door-qr__layout">
            <QrPoster
              branchName={branchName}
              onReady={handleQrReady}
              qrToken={doorQr.qrToken}
            />

            <section className="admin-door-qr__details">
              <p className="admin-door-qr__eyebrow">ENTRANCE CHECK</p>
              <h4>{branchName} 출입문에 비치하세요.</h4>
              <p className="admin-door-qr__description">
                회원은 홈 화면에서 이 QR을 스캔해 입실하거나 퇴실해요. QR은
                지점별로 구분되며 새로고침해도 바뀌지 않아요.
              </p>

              <div className="admin-door-qr__steps">
                <span aria-hidden="true">
                  <Smartphone size={18} />
                </span>
                <p>
                  <strong>회원 앱에서 스캔</strong>
                  <small>홈 → 입실 또는 퇴실 → QR 스캔</small>
                </p>
              </div>

              <div className="admin-door-qr__notice">
                <ShieldCheck aria-hidden="true" size={18} />
                <p>
                  <strong>외부 공유에 주의해 주세요.</strong>
                  <span>
                    이 QR은 만료되지 않는 고정 코드이므로 출입문 내부에만
                    비치하는 것이 안전해요.
                  </span>
                </p>
              </div>

              <div className="admin-door-qr__actions">
                <Button
                  disabled={!ready}
                  onClick={() => setLargeViewOpen(true)}
                  size="sm"
                  variant="ghost"
                >
                  <Expand aria-hidden="true" size={16} />
                  크게 보기
                </Button>
                <Button
                  disabled={!ready}
                  loading={saving}
                  onClick={() => void handleDownload()}
                  size="sm"
                  variant="ghost"
                >
                  <Download aria-hidden="true" size={16} />
                  이미지 저장
                </Button>
                <Button
                  disabled={!ready}
                  onClick={() => window.print()}
                  size="sm"
                >
                  <Printer aria-hidden="true" size={16} />
                  인쇄하기
                </Button>
              </div>
            </section>
          </div>
        )}
      </div>

      {doorQr.qrToken !== null && (
        <PrintQrSheet branchName={branchName} qrToken={doorQr.qrToken} />
      )}

      {doorQr.qrToken !== null && (
        <Modal
          footer={
            <>
              <Button onClick={() => setLargeViewOpen(false)} variant="ghost">
                닫기
              </Button>
              <Button
                className="admin-door-qr__modal-action"
                onClick={() => window.print()}
              >
                <Printer aria-hidden="true" size={16} />
                인쇄하기
              </Button>
            </>
          }
          onClose={() => setLargeViewOpen(false)}
          open={largeViewOpen}
          title={`${branchName} 출입 QR`}
        >
          <div className="admin-door-qr__large-view">
            <QrPoster branchName={branchName} qrToken={doorQr.qrToken} />
          </div>
        </Modal>
      )}
    </Card>
  );
}

function QrPoster({
  branchName,
  onReady,
  qrToken,
}: {
  branchName: string;
  onReady?: (svg: SVGSVGElement | null) => void;
  qrToken: string;
}) {
  return (
    <section className="admin-door-qr__poster">
      <div className="admin-door-qr__brand">
        <img alt="" src="/study-factory-logo.png" />
        <span>
          <strong>자격증공장</strong>
          <small>STUDY FACTORY</small>
        </span>
      </div>
      <div className="admin-door-qr__code-frame">
        <DoorQrCode
          label={`${branchName} 입실·퇴실 QR 코드`}
          onReady={onReady}
          qrToken={qrToken}
        />
      </div>
      <div className="admin-door-qr__poster-copy">
        <strong>{branchName}</strong>
        <span>회원 전용 입실 · 퇴실</span>
      </div>
    </section>
  );
}

function PrintQrSheet({
  branchName,
  qrToken,
}: {
  branchName: string;
  qrToken: string;
}) {
  return (
    <section aria-hidden="true" className="admin-door-qr__print-sheet">
      <div className="admin-door-qr__print-brand">
        <img alt="" src="/study-factory-logo.png" />
        <span>
          <strong>자격증공장</strong>
          <small>STUDY FACTORY</small>
        </span>
      </div>
      <p className="admin-door-qr__print-eyebrow">MEMBER ENTRANCE</p>
      <h1>{branchName} 출입 QR</h1>
      <p className="admin-door-qr__print-description">
        회원 홈에서 입실 또는 퇴실을 선택한 뒤 QR을 스캔해 주세요.
      </p>
      <div className="admin-door-qr__print-code">
        <DoorQrCode
          label={`${branchName} 인쇄용 입실·퇴실 QR 코드`}
          qrToken={qrToken}
        />
      </div>
      <p className="admin-door-qr__print-footer">회원 전용 · 외부 공유 금지</p>
    </section>
  );
}

async function downloadQrPng(svg: SVGSVGElement, branchName: string) {
  const exportSize = 1024;
  const svgCopy = svg.cloneNode(true) as SVGSVGElement;
  svgCopy.setAttribute('height', String(exportSize));
  svgCopy.setAttribute('width', String(exportSize));
  const source = new XMLSerializer().serializeToString(svgCopy);
  const sourceBlob = new Blob([source], {
    type: 'image/svg+xml;charset=utf-8',
  });
  const sourceUrl = URL.createObjectURL(sourceBlob);

  try {
    const image = await loadImage(sourceUrl);
    const canvas = document.createElement('canvas');
    canvas.height = exportSize;
    canvas.width = exportSize;
    const context = canvas.getContext('2d');

    if (context === null) {
      throw new Error('Canvas is unavailable.');
    }

    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, exportSize, exportSize);
    context.imageSmoothingEnabled = false;
    context.drawImage(image, 0, 0, exportSize, exportSize);

    const pngBlob = await canvasToPng(canvas);
    const downloadUrl = URL.createObjectURL(pngBlob);
    const link = document.createElement('a');
    link.download = `${safeFileName(branchName)}-entrance-qr.png`;
    link.href = downloadUrl;
    document.body.append(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 1_000);
  } finally {
    URL.revokeObjectURL(sourceUrl);
  }
}

function loadImage(source: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('QR image could not be loaded.'));
    image.src = source;
  });
}

function canvasToPng(canvas: HTMLCanvasElement) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob === null) {
        reject(new Error('QR image could not be encoded.'));
        return;
      }

      resolve(blob);
    }, 'image/png');
  });
}

function safeFileName(value: string) {
  return (
    value
      .normalize('NFC')
      .replace(/[<>:"/\\|?*]/g, '-')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '') || 'study-factory'
  );
}
