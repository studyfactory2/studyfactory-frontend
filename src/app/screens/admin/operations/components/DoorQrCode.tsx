import { useEffect, useRef, useState } from 'react';

type DoorQrCodeProps = {
  label: string;
  onReady?: (svg: SVGSVGElement | null) => void;
  qrToken: string;
};

const QR_RENDER_SIZE = 512;
const QR_LOGO_SIZE = 78;
const QR_LOGO_PLATE_SIZE = 96;
const SVG_NAMESPACE = 'http://www.w3.org/2000/svg';
let logoDataUrlPromise: Promise<string | null> | null = null;
let qrLogoId = 0;

export function DoorQrCode({ label, onReady, qrToken }: DoorQrCodeProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [renderFailed, setRenderFailed] = useState(false);

  useEffect(() => {
    const container = containerRef.current;
    let cancelled = false;

    container?.replaceChildren();
    onReady?.(null);

    void Promise.all([
      import('@zxing/browser'),
      import('@zxing/library'),
      loadQrLogoDataUrl(),
    ])
      .then(([{ BrowserQRCodeSvgWriter }, { EncodeHintType }, logoDataUrl]) => {
        if (cancelled || container === null) {
          return;
        }

        const writer = new BrowserQRCodeSvgWriter();
        const hints = new Map([
          [EncodeHintType.ERROR_CORRECTION, 'H'],
          [EncodeHintType.MARGIN, '4'],
        ]);
        const svg = writer.write(
          qrToken,
          QR_RENDER_SIZE,
          QR_RENDER_SIZE,
          hints,
        );
        const background = document.createElementNS(SVG_NAMESPACE, 'rect');

        background.setAttribute('fill', '#ffffff');
        background.setAttribute('height', '100%');
        background.setAttribute('width', '100%');
        svg.prepend(background);
        if (logoDataUrl !== null) {
          appendQrLogo(svg, logoDataUrl);
        }
        svg.setAttribute('aria-hidden', 'true');
        svg.setAttribute('focusable', 'false');
        svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
        svg.setAttribute('shape-rendering', 'crispEdges');

        container.replaceChildren(svg);
        setRenderFailed(false);
        onReady?.(svg);
      })
      .catch(() => {
        if (!cancelled && container !== null) {
          container.replaceChildren();
          setRenderFailed(true);
          onReady?.(null);
        }
      });

    return () => {
      cancelled = true;
      container?.replaceChildren();
      onReady?.(null);
    };
  }, [onReady, qrToken]);

  return (
    <div className="admin-door-qr__code">
      <div
        aria-hidden={renderFailed || undefined}
        aria-label={renderFailed ? undefined : label}
        className="admin-door-qr__code-image"
        ref={containerRef}
        role={renderFailed ? undefined : 'img'}
      />
      {renderFailed ? (
        <span className="admin-door-qr__render-error" role="alert">
          QR 이미지를 만들지 못했어요.
        </span>
      ) : null}
    </div>
  );
}

function appendQrLogo(svg: SVGSVGElement, logoDataUrl: string) {
  const plateStart = (QR_RENDER_SIZE - QR_LOGO_PLATE_SIZE) / 2;
  const logoStart = (QR_RENDER_SIZE - QR_LOGO_SIZE) / 2;
  const clipId = `study-factory-qr-logo-${++qrLogoId}`;
  const definitions = document.createElementNS(SVG_NAMESPACE, 'defs');
  const clipPath = document.createElementNS(SVG_NAMESPACE, 'clipPath');
  const clipShape = document.createElementNS(SVG_NAMESPACE, 'rect');
  const plate = document.createElementNS(SVG_NAMESPACE, 'rect');
  const logo = document.createElementNS(SVG_NAMESPACE, 'image');

  clipPath.setAttribute('id', clipId);
  clipShape.setAttribute('height', String(QR_LOGO_SIZE));
  clipShape.setAttribute('rx', '16');
  clipShape.setAttribute('width', String(QR_LOGO_SIZE));
  clipShape.setAttribute('x', String(logoStart));
  clipShape.setAttribute('y', String(logoStart));
  clipPath.append(clipShape);
  definitions.append(clipPath);

  plate.setAttribute('fill', '#ffffff');
  plate.setAttribute('height', String(QR_LOGO_PLATE_SIZE));
  plate.setAttribute('rx', '20');
  plate.setAttribute('width', String(QR_LOGO_PLATE_SIZE));
  plate.setAttribute('x', String(plateStart));
  plate.setAttribute('y', String(plateStart));

  logo.setAttribute('clip-path', `url(#${clipId})`);
  logo.setAttribute('height', String(QR_LOGO_SIZE));
  logo.setAttribute('href', logoDataUrl);
  logo.setAttribute('preserveAspectRatio', 'xMidYMid slice');
  logo.setAttribute('width', String(QR_LOGO_SIZE));
  logo.setAttribute('x', String(logoStart));
  logo.setAttribute('y', String(logoStart));

  svg.append(definitions, plate, logo);
}

function loadQrLogoDataUrl() {
  if (logoDataUrlPromise === null) {
    logoDataUrlPromise = fetch('/study-factory-logo.png', {
      cache: 'force-cache',
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error('Study Factory logo could not be loaded.');
        }

        return response.blob();
      })
      .then(blobToDataUrl)
      .catch(() => {
        logoDataUrlPromise = null;
        return null;
      });
  }

  return logoDataUrlPromise;
}

function blobToDataUrl(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
        return;
      }

      reject(new Error('Study Factory logo could not be encoded.'));
    };
    reader.onerror = () => reject(reader.error ?? new Error('Read failed.'));
    reader.readAsDataURL(blob);
  });
}
