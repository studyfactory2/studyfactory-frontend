/** Presentation-only formatting for the study-time report. */
export {
  formatDurationClock,
  formatDurationKorean,
} from '../../../../shared/lib/duration';

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
