const SEOUL_TIME_ZONE = 'Asia/Seoul';

/** Convert an absolute backend timestamp into Study Factory's business date. */
export function toSeoulDateKey(timestamp: string | null): string {
  if (!timestamp) {
    return '';
  }

  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  const parts = new Intl.DateTimeFormat('en-US', {
    day: '2-digit',
    month: '2-digit',
    timeZone: SEOUL_TIME_ZONE,
    year: 'numeric',
  }).formatToParts(date);
  const valueByPart = new Map(parts.map((part) => [part.type, part.value]));

  return `${valueByPart.get('year')}-${valueByPart.get('month')}-${valueByPart.get('day')}`;
}
