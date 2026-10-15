import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import type { SessionOwnerKey } from '../../../core/session';
import type { AttendanceLeaveManagementTarget } from '../../attendances/workspace/components/AttendanceBoard';

const DIALOG_STATE_KEY = 'studyfactoryAttendanceLeaveDialog';

type AttendanceLeaveDialogState = {
  branchId: number;
  ownerKey: SessionOwnerKey;
  target: AttendanceLeaveManagementTarget;
  viewKey: string;
};

type UseAttendanceLeaveDialogArgs = {
  branchId: number;
  dateKey: string;
  ownerKey: SessionOwnerKey;
};

/** Keep the leave viewer in history without navigating away from attendance. */
export function useAttendanceLeaveDialog({
  branchId,
  dateKey,
  ownerKey,
}: UseAttendanceLeaveDialogArgs) {
  const location = useLocation();
  const navigate = useNavigate();
  const [viewKey] = useState(
    () => crypto.randomUUID?.() ?? `${Date.now()}-${Math.random()}`,
  );
  const openingEntryKey = useRef<string | null>(null);
  const closingEntryKey = useRef<string | null>(null);
  const cleanedEntryKey = useRef<string | null>(null);
  const state = toRecord(location.state);
  const marker = state[DIALOG_STATE_KEY];
  const hasMarker = Object.prototype.hasOwnProperty.call(
    state,
    DIALOG_STATE_KEY,
  );
  const target =
    isDialogState(marker) &&
    marker.viewKey === viewKey &&
    marker.ownerKey === ownerKey &&
    marker.branchId === branchId &&
    marker.target.dateKey === dateKey
      ? marker.target
      : null;

  useEffect(() => {
    openingEntryKey.current = null;
    closingEntryKey.current = null;
  }, [location.key]);

  useEffect(() => {
    if (
      !hasMarker ||
      target !== null ||
      cleanedEntryKey.current === location.key
    ) {
      return;
    }

    // A refresh, new session, branch change, or different ledger date must
    // not revive a previous viewer. Replace only this entry, never go back
    // from effect cleanup (which also runs during StrictMode replay).
    cleanedEntryKey.current = location.key;
    const nextState = { ...toRecord(location.state) };
    delete nextState[DIALOG_STATE_KEY];
    void navigate(
      {
        hash: location.hash,
        pathname: location.pathname,
        search: location.search,
      },
      { replace: true, state: nextState },
    );
  }, [
    hasMarker,
    location.hash,
    location.key,
    location.pathname,
    location.search,
    location.state,
    navigate,
    target,
  ]);

  const onOpen = (nextTarget: AttendanceLeaveManagementTarget) => {
    if (
      target !== null ||
      openingEntryKey.current === location.key ||
      !isTarget(nextTarget) ||
      nextTarget.dateKey !== dateKey
    ) {
      return;
    }

    // Only a user action pushes history. Same-URL navigation keeps the
    // attendance screen, its selection, and its filters mounted.
    openingEntryKey.current = location.key;
    const nextMarker: AttendanceLeaveDialogState = {
      branchId,
      ownerKey,
      target: { ...nextTarget },
      viewKey,
    };
    void navigate(
      {
        hash: location.hash,
        pathname: location.pathname,
        search: location.search,
      },
      { state: { ...state, [DIALOG_STATE_KEY]: nextMarker } },
    );
  };

  const onClose = () => {
    if (target === null || closingEntryKey.current === location.key) {
      return;
    }

    // Consume the same entry as phone/browser Back. A synchronous guard
    // prevents two close taps from also leaving the attendance screen.
    closingEntryKey.current = location.key;
    void navigate(-1);
  };

  return { onClose, onOpen, target };
}

function toRecord(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function isTarget(value: unknown): value is AttendanceLeaveManagementTarget {
  const target = toRecord(value);

  return (
    typeof target.dateKey === 'string' &&
    typeof target.memberId === 'number' &&
    Number.isSafeInteger(target.memberId) &&
    target.memberId > 0 &&
    typeof target.slot === 'number' &&
    Number.isInteger(target.slot) &&
    target.slot >= 1 &&
    target.slot <= 7
  );
}

function isDialogState(value: unknown): value is AttendanceLeaveDialogState {
  const state = toRecord(value);

  return (
    typeof state.branchId === 'number' &&
    typeof state.ownerKey === 'string' &&
    typeof state.viewKey === 'string' &&
    isTarget(state.target)
  );
}
