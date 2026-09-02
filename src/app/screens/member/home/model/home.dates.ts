/**
 * Calendar helpers pinned to the study factory's operating timezone.
 * The browser clock may sit anywhere, so every "today / this week / this month"
 * boundary is resolved in Asia/Seoul rather than local time.
 */
export const STUDY_TIME_ZONE = 'Asia/Seoul';

const dateKeyFormatter = new Intl.DateTimeFormat('en-CA', {
  day: '2-digit',
  month: '2-digit',
  timeZone: STUDY_TIME_ZONE,
  year: 'numeric',
});

const timeOfDayFormatter = new Intl.DateTimeFormat('en-GB', {
  hour: '2-digit',
  hour12: false,
  minute: '2-digit',
  timeZone: STUDY_TIME_ZONE,
});

const timeOfDayWithSecondsFormatter = new Intl.DateTimeFormat('en-GB', {
  hour: '2-digit',
  hour12: false,
  minute: '2-digit',
  second: '2-digit',
  timeZone: STUDY_TIME_ZONE,
});

const WEEKDAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'] as const;

export type SeoulToday = {
  dateKey: string;
  dayIndex: number;
  month: number;
  year: number;
};

export function getSeoulToday(now: Date = new Date()): SeoulToday {
  const dateKey = dateKeyFormatter.format(now);
  const { day, month, year } = splitDateKey(dateKey);

  return {
    dateKey,
    dayIndex: toMondayFirstIndex(Date.UTC(year, month - 1, day)),
    month,
    year,
  };
}

export function getWeekStartKey(dateKey: string) {
  const { day, month, year } = splitDateKey(dateKey);
  const timestamp = Date.UTC(year, month - 1, day);
  const mondayFirstIndex = toMondayFirstIndex(timestamp);

  return toDateKey(new Date(timestamp - mondayFirstIndex * 86_400_000));
}

/** Milliseconds remaining until the next Asia/Seoul midnight, plus a small cushion. */
export function getMillisecondsUntilNextSeoulDay(now: Date = new Date()) {
  const [hour, minute, second] = timeOfDayWithSecondsFormatter
    .format(now)
    .split(':')
    .map(Number);
  const elapsedMilliseconds =
    (((hour % 24) * 60 + minute) * 60 + second) * 1_000;

  return Math.max(1_000, 86_400_000 - elapsedMilliseconds + 1_000);
}

export function getNextMonth(year: number, month: number) {
  return month === 12
    ? { month: 1, year: year + 1 }
    : { month: month + 1, year };
}

export function formatKoreanDate(dateKey: string) {
  const { day, month, year } = splitDateKey(dateKey);
  const weekday =
    WEEKDAY_LABELS[new Date(Date.UTC(year, month - 1, day)).getUTCDay()];

  return `${month}월 ${day}일 (${weekday})`;
}

export function formatTimeOfDay(instant: string) {
  const parsed = new Date(instant);

  return Number.isNaN(parsed.getTime())
    ? null
    : timeOfDayFormatter.format(parsed);
}

export function compareDateKeys(left: string, right: string) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function splitDateKey(dateKey: string) {
  const [year, month, day] = dateKey.split('-').map(Number);
  return { day, month, year };
}

function toDateKey(date: Date) {
  return [
    date.getUTCFullYear(),
    String(date.getUTCMonth() + 1).padStart(2, '0'),
    String(date.getUTCDate()).padStart(2, '0'),
  ].join('-');
}

/** Monday = 0 … Sunday = 6, matching the weekly plan's dayIndex. */
function toMondayFirstIndex(timestamp: number) {
  const sundayFirstIndex = new Date(timestamp).getUTCDay();
  return sundayFirstIndex === 0 ? 6 : sundayFirstIndex - 1;
}
