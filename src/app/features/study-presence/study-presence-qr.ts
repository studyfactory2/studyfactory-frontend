const STUDY_FACTORY_QR_PATTERN = /^sfqr1\.[1-9]\d*\.[A-Za-z0-9_-]{43}$/;

/**
 * Returns the signed door token when the scanned value is a 자격증공장 QR,
 * otherwise null.
 *
 * This never throws: the scanner calls it on every decoded frame, and a
 * foreign QR drifting through the viewfinder must not interrupt scanning.
 */
export function parseStudyPresenceQrToken(value: string): string | null {
  const normalizedValue = value.trim();

  if (normalizedValue.length === 0 || normalizedValue.length > 512) {
    return null;
  }

  const qrToken = extractTokenFromUrl(normalizedValue) ?? normalizedValue;

  return STUDY_FACTORY_QR_PATTERN.test(qrToken) ? qrToken : null;
}

function extractTokenFromUrl(value: string) {
  try {
    const url = new URL(value);

    return (
      url.searchParams.get('qrToken') ??
      url.searchParams.get('token') ??
      url.searchParams.get('qr')
    );
  } catch {
    return null;
  }
}
