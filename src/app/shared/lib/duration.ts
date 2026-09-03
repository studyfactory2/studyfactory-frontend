/**
 * Duration formatting shared by the study report and the member profile, so a
 * span of seconds reads the same wherever it is shown.
 */

/** 4530 → "1:15:30". Hours are unpadded; minutes and seconds are not. */
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

/** 4530 → "1시간 15분". Rounds down; never renders a zero component. */
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
