import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { SessionOwnerKey } from '../../../../core/session';
import {
  fetchMyStudyPresenceHistory,
  type StudyPresenceSelfSessionResponse,
} from '../../../../features/study-presence/study-presence-api';
import { studyPresenceQueryKeys } from '../../../../features/study-presence/study-presence-query-keys';
import { fetchMyStudyTimeReport } from '../../../../features/study-time/study-time-api';
import { studyTimeQueryKeys } from '../../../../features/study-time/study-time-query-keys';
import {
  addDays,
  formatTimeOfDayFromEpochMs,
  getMonthEndKey,
  getMonthStartKey,
  getSeoulDayStartMs,
  getWeekStartKey,
  getWeekdayLabel,
  listDateKeys,
  SEOUL_DAY_MS,
  type SeoulToday,
} from '../model/study.dates';
import { getStudyDayStatus } from '../model/study.status';
import type {
  StudyDateRange,
  StudyDayRow,
  StudyRangeKey,
} from '../model/study.types';
import { useSeoulToday } from './useSeoulToday';

const LIVE_REFRESH_INTERVAL_MS = 60_000;
const STALE_TIME_MS = 30_000;

/** Presence clamped to one Seoul calendar day. */
type DailyPresence = {
  active: boolean;
  endedAtMs: number | null;
  sessionCount: number;
  startedAtMs: number | null;
};

export function useMemberStudy(memberId: number, ownerKey: SessionOwnerKey) {
  const today = useSeoulToday();
  const [range, setRange] = useState<StudyRangeKey>('week');
  const [requestedDateKey, setRequestedDateKey] = useState<string | null>(null);

  const dateRange = useMemo(() => getRangeBounds(range, today), [range, today]);
  const { from, to } = dateRange;
  const rangeIncludesToday = today.dateKey >= from && today.dateKey <= to;

  /*
   * History drives the live signal, so it polls whenever the range can still
   * change — a check-in or checkout made on another screen or device shows up
   * within a minute.
   */
  const presenceHistoryQuery = useQuery({
    queryFn: () => fetchMyStudyPresenceHistory(from, to, memberId),
    queryKey: studyPresenceQueryKeys.history(ownerKey, from, to),
    refetchInterval: rangeIncludesToday ? LIVE_REFRESH_INTERVAL_MS : false,
    refetchOnWindowFocus: true,
    staleTime: STALE_TIME_MS,
  });

  const hasActiveSession =
    presenceHistoryQuery.data?.sessions.some(
      (session) => session.currentlyActive,
    ) ?? false;

  /*
   * Recognized time only advances while a session is open, and the refreshed
   * history above is what clears `hasActiveSession` after a checkout — which
   * stops this poll on the next render.
   */
  const reportQuery = useQuery({
    queryFn: () => fetchMyStudyTimeReport(from, to, memberId),
    queryKey: studyTimeQueryKeys.report(ownerKey, from, to),
    refetchInterval:
      rangeIncludesToday && hasActiveSession ? LIVE_REFRESH_INTERVAL_MS : false,
    refetchOnWindowFocus: true,
    staleTime: STALE_TIME_MS,
  });

  const rows = useMemo<StudyDayRow[]>(() => {
    const reportByDate = new Map(
      (reportQuery.data?.days ?? []).map((day) => [day.studyDate, day]),
    );
    const dateKeys = listDateKeys(from, to);
    const presenceByDate = projectSessionsOntoDays(
      presenceHistoryQuery.data?.sessions ?? [],
      dateKeys,
    );

    return dateKeys.map((dateKey) => {
      const report = reportByDate.get(dateKey) ?? null;
      const presence = presenceByDate.get(dateKey);
      const dayEndMs = getSeoulDayStartMs(dateKey) + SEOUL_DAY_MS;

      return {
        breakSeconds: report?.recognizedBreakDuration.totalSeconds ?? 0,
        breaks: report?.breaks ?? [],
        dateKey,
        excludedPeriodCount: report?.excludedPeriods.length ?? 0,
        isToday: dateKey === today.dateKey,
        periodSeconds: report?.recognizedPeriodDuration.totalSeconds ?? 0,
        periods: report?.periods ?? [],
        presenceEndLabel:
          presence === undefined ||
          presence.active ||
          presence.endedAtMs === null
            ? null
            : formatDayBoundedTime(presence.endedAtMs, dayEndMs),
        presenceSeconds: report?.presenceDuration.totalSeconds ?? 0,
        presenceStartLabel:
          presence === undefined || presence.startedAtMs === null
            ? null
            : formatDayBoundedTime(presence.startedAtMs, dayEndMs),
        report,
        sessionCount: presence?.sessionCount ?? 0,
        status: getStudyDayStatus({
          dateKey,
          hasActiveSession: presence?.active ?? false,
          sessionCount: presence?.sessionCount ?? 0,
          todayKey: today.dateKey,
        }),
        totalSeconds: report?.totalRecognizedStudyDuration.totalSeconds ?? 0,
        weekdayLabel: getWeekdayLabel(dateKey),
      };
    });
  }, [from, presenceHistoryQuery.data, reportQuery.data, to, today.dateKey]);

  const selectedDateKey =
    requestedDateKey !== null &&
    requestedDateKey >= from &&
    requestedDateKey <= to
      ? requestedDateKey
      : today.dateKey;

  const selectedRow =
    rows.find((row) => row.dateKey === selectedDateKey) ?? null;

  const totals = reportQuery.data?.totals ?? null;
  const attendedDayCount = reportQuery.data?.attendedDayCount ?? 0;
  const totalSeconds = totals?.totalRecognizedStudyDuration.totalSeconds ?? 0;

  return {
    dateRange,
    isLive: hasActiveSession,
    onSelectDate: setRequestedDateKey,
    onSetRange: setRange,
    presenceHistory: {
      errorMessage: presenceHistoryQuery.isError
        ? presenceHistoryQuery.error.message
        : null,
      loading: presenceHistoryQuery.isPending,
      onRetry: () => void presenceHistoryQuery.refetch(),
    },
    range,
    report: {
      errorMessage: reportQuery.isError ? reportQuery.error.message : null,
      loading: reportQuery.isPending,
      onRetry: () => void reportQuery.refetch(),
    },
    rows,
    selectedDateKey,
    selectedRow,
    summary: {
      attendedDayCount,
      averageSecondsPerAttendedDay:
        attendedDayCount === 0
          ? 0
          : Math.round(totalSeconds / attendedDayCount),
      breakSeconds: totals?.recognizedBreakDuration.totalSeconds ?? 0,
      maxDaySeconds: rows.reduce(
        (largest, row) => Math.max(largest, row.totalSeconds),
        0,
      ),
      periodSeconds: totals?.recognizedPeriodDuration.totalSeconds ?? 0,
      presenceSeconds: totals?.presenceDuration.totalSeconds ?? 0,
      totalSeconds,
    },
    today,
  };
}

function getRangeBounds(
  range: StudyRangeKey,
  today: SeoulToday,
): StudyDateRange {
  if (range === 'today') {
    return { from: today.dateKey, to: today.dateKey };
  }

  if (range === 'week') {
    const weekStart = getWeekStartKey(today.dateKey);

    return { from: weekStart, to: addDays(weekStart, 6) };
  }

  return {
    from: getMonthStartKey(today.year, today.month),
    to: getMonthEndKey(today.year, today.month),
  };
}

/**
 * Projects every session onto each Seoul calendar day its effective overlap
 * touches, clamping the fragment to that day's midnight boundaries.
 *
 * The server already clamps `overlapStartedAt`/`overlapEndedAt` to the whole
 * requested window and resolves pending automatic checkouts, but a session may
 * still span midnight (automatic close is disabled by default), so grouping by
 * the check-in date alone would drop the later day and disagree with the
 * study-time report, which splits recognized time per Seoul day.
 */
function projectSessionsOntoDays(
  sessions: readonly StudyPresenceSelfSessionResponse[],
  dateKeys: readonly string[],
) {
  const projections = new Map<string, DailyPresence>();

  for (const dateKey of dateKeys) {
    const dayStartMs = getSeoulDayStartMs(dateKey);
    const dayEndMs = dayStartMs + SEOUL_DAY_MS;
    const sessionIds = new Set<number>();
    let startedAtMs: number | null = null;
    let endedAtMs: number | null = null;
    let active = false;

    for (const session of sessions) {
      const overlapStartMs = Date.parse(session.overlapStartedAt);
      const overlapEndMs = Date.parse(session.overlapEndedAt);

      if (Number.isNaN(overlapStartMs) || Number.isNaN(overlapEndMs)) {
        continue;
      }

      const fragmentStartMs = Math.max(overlapStartMs, dayStartMs);
      const fragmentEndMs = Math.min(overlapEndMs, dayEndMs);
      const touchesDay =
        fragmentEndMs > fragmentStartMs ||
        // a just-opened session has a zero-length overlap on its first day
        (overlapStartMs === overlapEndMs &&
          overlapStartMs >= dayStartMs &&
          overlapStartMs < dayEndMs);

      if (!touchesDay) {
        continue;
      }

      sessionIds.add(session.sessionId);

      if (startedAtMs === null || fragmentStartMs < startedAtMs) {
        startedAtMs = fragmentStartMs;
      }

      if (endedAtMs === null || fragmentEndMs > endedAtMs) {
        endedAtMs = fragmentEndMs;
      }

      // only the last day an open session reaches is still running
      if (session.currentlyActive && overlapEndMs <= dayEndMs) {
        active = true;
      }
    }

    projections.set(dateKey, {
      active,
      endedAtMs,
      sessionCount: sessionIds.size,
      startedAtMs,
    });
  }

  return projections;
}

/** Midnight closing a day reads as 24:00 rather than 00:00 of the next one. */
function formatDayBoundedTime(epochMs: number, dayEndMs: number) {
  return epochMs === dayEndMs ? '24:00' : formatTimeOfDayFromEpochMs(epochMs);
}
