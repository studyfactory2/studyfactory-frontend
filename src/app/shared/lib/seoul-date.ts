/**
 * Calendar helpers pinned to the study factory's operating timezone.
 *
 * The browser clock may sit anywhere in the world, so every day key, range
 * boundary and clock label is resolved in Asia/Seoul — the same zone the
 * backend pins its own day boundaries to (see TimeConfig.STUDY_FACTORY_ZONE).
 *
 * Asia/Seoul is a fixed +09:00 offset with no daylight saving (and has been
 * since 1988), so a calendar day boundary is exact arithmetic rather than a
 * round trip through Intl.
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

const MILLISECONDS_PER_DAY = 86_400_000;

export const SEOUL_DAY_MS = MILLISECONDS_PER_DAY;

export const SEOUL_WEEKDAY_LABELS = WEEKDAY_LABELS;

export type SeoulToday = {
  dateKey: string;
  month: number;
  year: number;
};

export type SeoulMonth = {
  month: number;
  year: number;
};

export type MonthGridCell = {
  dateKey: string;
  inMonth: boolean;
};

export function getSeoulToday(now: Date = new Date()): SeoulToday {
  const dateKey = dateKeyFormatter.format(now);
  const { month, year } = splitDateKey(dateKey);

  return { dateKey, month, year };
}

export function getSeoulDayStartMs(dateKey: string) {
  return Date.parse(`${dateKey}T00:00:00+09:00`);
}

export function formatTimeOfDayFromEpochMs(epochMs: number) {
  return timeOfDayFormatter.format(new Date(epochMs));
}

/** Milliseconds remaining until the next Asia/Seoul midnight, plus a cushion. */
export function getMillisecondsUntilNextSeoulDay(now: Date = new Date()) {
  const [hour, minute, second] = timeOfDayWithSecondsFormatter
    .format(now)
    .split(':')
    .map(Number);
  const elapsedMilliseconds =
    (((hour % 24) * 60 + minute) * 60 + second) * 1_000;

  return Math.max(1_000, MILLISECONDS_PER_DAY - elapsedMilliseconds + 1_000);
}

/** Monday of the week containing the given date key. */
export function getWeekStartKey(dateKey: string) {
  const timestamp = toTimestamp(dateKey);

  return toDateKey(
    timestamp - toMondayFirstIndex(timestamp) * MILLISECONDS_PER_DAY,
  );
}

export function addDays(dateKey: string, days: number) {
  return toDateKey(toTimestamp(dateKey) + days * MILLISECONDS_PER_DAY);
}

export function getMonthStartKey(year: number, month: number) {
  return `${year}-${pad(month)}-01`;
}

export function getMonthEndKey(year: number, month: number) {
  return toDateKey(Date.UTC(year, month, 1) - MILLISECONDS_PER_DAY);
}

export function getPreviousMonth(year: number, month: number): SeoulMonth {
  return month === 1
    ? { month: 12, year: year - 1 }
    : { month: month - 1, year };
}

export function getNextMonth(year: number, month: number): SeoulMonth {
  return month === 12
    ? { month: 1, year: year + 1 }
    : { month: month + 1, year };
}

export function compareMonths(left: SeoulMonth, right: SeoulMonth) {
  if (left.year !== right.year) {
    return left.year < right.year ? -1 : 1;
  }

  return left.month === right.month ? 0 : left.month < right.month ? -1 : 1;
}

/**
 * Whole Sunday-first weeks covering the given month — five or six rows
 * depending on where the first falls — with the neighbouring-month padding
 * days flagged so they can be dimmed or hidden. Only the weeks the month
 * actually touches are emitted, so no month ever renders a fully empty row.
 */
export function listMonthGridCells(
  year: number,
  month: number,
): MonthGridCell[] {
  const firstOfMonth = getMonthStartKey(year, month);
  const lastOfMonth = getMonthEndKey(year, month);
  const leadingDayCount = toSundayFirstIndex(toTimestamp(firstOfMonth));
  const gridStart = addDays(firstOfMonth, -leadingDayCount);
  const cellCount =
    Math.ceil((leadingDayCount + getDayOfMonth(lastOfMonth)) / 7) * 7;
  const cells: MonthGridCell[] = [];

  for (let offset = 0; offset < cellCount; offset += 1) {
    const dateKey = addDays(gridStart, offset);

    cells.push({
      dateKey,
      inMonth: dateKey >= firstOfMonth && dateKey <= lastOfMonth,
    });
  }

  return cells;
}

/** Every date key from `from` to `to`, inclusive. */
export function listDateKeys(from: string, to: string) {
  const keys: string[] = [];
  const lastTimestamp = toTimestamp(to);

  for (
    let timestamp = toTimestamp(from);
    timestamp <= lastTimestamp;
    timestamp += MILLISECONDS_PER_DAY
  ) {
    keys.push(toDateKey(timestamp));
  }

  return keys;
}

export function getWeekdayLabel(dateKey: string) {
  return WEEKDAY_LABELS[new Date(toTimestamp(dateKey)).getUTCDay()];
}

export function getDayOfMonth(dateKey: string) {
  return splitDateKey(dateKey).day;
}

export function formatKoreanDate(dateKey: string) {
  const { day, month } = splitDateKey(dateKey);

  return `${month}월 ${day}일 (${getWeekdayLabel(dateKey)})`;
}

export function formatKoreanMonth(year: number, month: number) {
  return `${year}년 ${month}월`;
}

export function formatShortDate(dateKey: string) {
  const { day, month } = splitDateKey(dateKey);

  return `${month}.${pad(day)}`;
}

export function formatDateRange(from: string, to: string) {
  if (from === to) {
    return formatKoreanDate(from);
  }

  const start = splitDateKey(from);
  const end = splitDateKey(to);

  return start.year === end.year && start.month === end.month
    ? `${start.month}월 ${start.day}일 ~ ${end.day}일`
    : `${start.month}월 ${start.day}일 ~ ${end.month}월 ${end.day}일`;
}

export function compareDateKeys(left: string, right: string) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function splitDateKey(dateKey: string) {
  const [year, month, day] = dateKey.split('-').map(Number);

  return { day, month, year };
}

function toTimestamp(dateKey: string) {
  const { day, month, year } = splitDateKey(dateKey);

  return Date.UTC(year, month - 1, day);
}

function toDateKey(timestamp: number) {
  const date = new Date(timestamp);

  return [
    date.getUTCFullYear(),
    pad(date.getUTCMonth() + 1),
    pad(date.getUTCDate()),
  ].join('-');
}

/** Monday = 0 … Sunday = 6. */
function toMondayFirstIndex(timestamp: number) {
  const sundayFirstIndex = new Date(timestamp).getUTCDay();

  return sundayFirstIndex === 0 ? 6 : sundayFirstIndex - 1;
}

/** Sunday = 0 … Saturday = 6, matching the Korean month calendar. */
function toSundayFirstIndex(timestamp: number) {
  return new Date(timestamp).getUTCDay();
}

function pad(value: number) {
  return String(value).padStart(2, '0');
}
