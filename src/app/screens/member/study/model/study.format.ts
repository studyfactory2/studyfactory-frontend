/** Presentation-only formatting for the study-time report. */
export function formatDurationClock(totalSeconds: number) {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(safeSeconds / 3_600);
  const minutes = Math.floor((safeSeconds % 3_600) / 60);
  const seconds = safeSeconds % 60;

  return [hours, minutes, seconds]
    .map((part, index) =>
      index === 0 ? String(part) : String(part).padStart(2, '0'),
    )
    .join(':');
}

export function formatDurationKorean(totalSeconds: number) {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(safeSeconds / 3_600);
  const minutes = Math.floor((safeSeconds % 3_600) / 60);

  if (hours === 0 && minutes === 0) {
    return '0분';
  }

  if (hours === 0) {
    return `${minutes}분`;
  }

  return minutes === 0 ? `${hours}시간` : `${hours}시간 ${minutes}분`;
}

/**
 * The backend serializes LocalTime as HH:mm or HH:mm:ss depending on whether
 * seconds are zero, so only the first two segments are ever displayed.
 */
export function formatClockTime(localTime: string) {
  const [hour, minute] = localTime.split(':');

  return hour === undefined || minute === undefined
    ? localTime
    : `${hour}:${minute}`;
}

export function formatTimeSpan(startsAt: string, endsAt: string) {
  return `${formatClockTime(startsAt)}–${formatClockTime(endsAt)}`;
}

/** Share of the whole, guarded against a zero denominator. */
export function toPercentage(part: number, whole: number) {
  return whole <= 0 ? 0 : Math.round((part / whole) * 1_000) / 10;
}
