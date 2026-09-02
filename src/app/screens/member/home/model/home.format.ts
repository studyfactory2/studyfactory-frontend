/** Presentation-only formatting for durations shown on the member home screen. */
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

export function formatLeaveSlots(slots: string | null) {
  if (!slots) {
    return null;
  }

  const periods = slots
    .split(',')
    .map((slot) => slot.trim())
    .filter(Boolean);

  return periods.length === 0 ? null : `${periods.join('·')}교시`;
}
