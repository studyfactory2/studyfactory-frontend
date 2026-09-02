import { useEffect, useState } from 'react';

/**
 * Derives the live check-in duration from the server timestamp and re-renders
 * once a second, so the counter stays current without polling the backend.
 */
export function useLiveElapsedSeconds(startedAt: string | null) {
  const [, setTick] = useState(0);

  useEffect(() => {
    if (startedAt === null) {
      return;
    }

    const intervalId = window.setInterval(() => {
      setTick((tick) => tick + 1);
    }, 1_000);

    return () => window.clearInterval(intervalId);
  }, [startedAt]);

  return toElapsedSeconds(startedAt);
}

function toElapsedSeconds(startedAt: string | null) {
  if (startedAt === null) {
    return null;
  }

  const startedTimestamp = new Date(startedAt).getTime();

  if (Number.isNaN(startedTimestamp)) {
    return null;
  }

  return Math.max(0, Math.floor((Date.now() - startedTimestamp) / 1_000));
}
