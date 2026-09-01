export function isCanonicalMondayKey(value: string) {
  const date = parseDateKey(value);
  return date !== null && toDateKey(getMonday(date)) === value;
}

export function isMonthKey(value: string) {
  const firstDay = parseDateKey(`${value}-01`);
  return firstDay !== null && toMonthKey(firstDay) === value;
}

export function getCurrentRoutePeriodKeys() {
  const currentToday = startOfDay(new Date());
  const params = new URLSearchParams(window.location.search);
  const currentWeekStart = resolveWeekStart(params.get('week'), currentToday);
  const currentDayIndex = resolveSelectedDay(
    params.get('day'),
    currentWeekStart,
    currentToday,
  );

  return {
    monthKey: toMonthKey(addDays(currentWeekStart, currentDayIndex)),
    weekStartKey: toDateKey(currentWeekStart),
  };
}

export function resolveWeekStart(value: string | null, fallback: Date) {
  const parsed = value ? parseDateKey(value) : null;
  return getMonday(parsed ?? fallback);
}

export function resolveSelectedDay(
  value: string | null,
  weekStart: Date,
  today: Date,
) {
  if (value !== null && /^[0-6]$/.test(value)) {
    return Number(value);
  }

  const todayIndex = daysBetween(weekStart, today);
  return todayIndex >= 0 && todayIndex <= 6 ? todayIndex : 0;
}

export function parseDateKey(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);

  if (!match) {
    return null;
  }

  const date = new Date(
    Number(match[1]),
    Number(match[2]) - 1,
    Number(match[3]),
  );
  return toDateKey(date) === value ? startOfDay(date) : null;
}

export function getMonday(date: Date) {
  const monday = startOfDay(date);
  const day = monday.getDay();
  monday.setDate(monday.getDate() + (day === 0 ? -6 : 1 - day));
  return monday;
}

export function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function addDays(date: Date, amount: number) {
  const next = startOfDay(date);
  next.setDate(next.getDate() + amount);
  return next;
}

export function daysBetween(start: Date, end: Date) {
  const millisecondsPerDay = 86_400_000;
  const utcStart = Date.UTC(
    start.getFullYear(),
    start.getMonth(),
    start.getDate(),
  );
  const utcEnd = Date.UTC(end.getFullYear(), end.getMonth(), end.getDate());
  return Math.round((utcEnd - utcStart) / millisecondsPerDay);
}

export function toDateKey(date: Date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-');
}

export function toMonthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

export function formatMonthLabel(month: string) {
  const [year, monthNumber] = month.split('-').map(Number);
  return `${year}년 ${monthNumber}월`;
}

export function formatWeekRange(weekStart: Date) {
  const end = addDays(weekStart, 6);
  const startLabel = `${weekStart.getMonth() + 1}월 ${weekStart.getDate()}일`;
  const endLabel = `${end.getMonth() + 1}월 ${end.getDate()}일`;
  return `${startLabel} – ${endLabel}`;
}

export function formatShortDate(date: Date) {
  return `${date.getMonth() + 1}.${date.getDate()}`;
}

export function formatFullDate(date: Date) {
  return `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일`;
}

export function isSameDate(left: Date, right: Date) {
  return toDateKey(left) === toDateKey(right);
}
