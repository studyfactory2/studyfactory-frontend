/**
 * Suggestion timestamps are the only member-facing dates we cannot safely
 * convert between zones.
 *
 * `createdAt` and `updatedAt` come from Spring Data auditing, which writes
 * LocalDateTime through the JVM's default zone — deliberately left alone in
 * TimeConfig so existing rows are not reinterpreted. In production that JVM
 * runs UTC (no TZ is set in compose.prod.yml, and eclipse-temurin defaults to
 * UTC), while a developer's machine runs Asia/Seoul. Attaching either offset
 * would therefore be right in one environment and nine hours wrong in the
 * other.
 *
 * So the date is read straight off the string the server sent, with no zone
 * arithmetic at all, and the clock time is not shown. The proper fix is a
 * DateTimeProvider pinned to Asia/Seoul on the backend, which is a separate
 * change because it splits old rows from new ones.
 */
export function formatSuggestionDate(localDateTime: string) {
  const [datePart] = localDateTime.split('T');
  const [year, month, day] = (datePart ?? '').split('-').map(Number);

  return Number.isFinite(year) && Number.isFinite(month) && Number.isFinite(day)
    ? `${year}년 ${month}월 ${day}일`
    : localDateTime;
}
