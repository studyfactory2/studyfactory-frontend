const STUDY_FACTORY_QR_PATTERN = /^sfqr1\.[1-9]\d*\.[A-Za-z0-9_-]{43}$/;

export function extractStudyPresenceQrToken(value: string) {
  const normalizedValue = value.trim();

  if (normalizedValue.length === 0 || normalizedValue.length > 512) {
    throw new Error('자격증공장 출입 QR이 아니에요.');
  }

  const qrToken = extractTokenFromUrl(normalizedValue) ?? normalizedValue;

  if (!STUDY_FACTORY_QR_PATTERN.test(qrToken)) {
    throw new Error('자격증공장 출입 QR이 아니에요.');
  }

  return qrToken;
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
