import type { DailyLeaveStatusResponse } from '../../../../features/leaves/leaves-api';

export type AdminLeaveFilter =
  'ALL' | 'AFTERNOON' | 'FULL' | 'MORNING' | 'OTHER';

export type AdminLeaveSourceTone = 'fixed' | 'office' | 'other' | 'self';

export type AdminDailyLeaveRecord = {
  category: Exclude<AdminLeaveFilter, 'ALL'>;
  key: string;
  label: string;
  requestedAfterEight: boolean;
  sourceLabel: string;
  sourceTone: AdminLeaveSourceTone;
};

export type AdminDailyLeaveMember = {
  memberId: number;
  name: string;
  records: AdminDailyLeaveRecord[];
  seatNumber: number | null;
};

export type AdminDailyLeaveMetrics = {
  lateRequests: number;
  officeEntries: number;
  people: number;
  selfRequests: number;
};

export const ADMIN_LEAVE_FILTERS: ReadonlyArray<{
  label: string;
  value: AdminLeaveFilter;
}> = [
  { label: '전체', value: 'ALL' },
  { label: '월차', value: 'FULL' },
  { label: '오전 반차', value: 'MORNING' },
  { label: '오후 반차', value: 'AFTERNOON' },
  { label: '기타', value: 'OTHER' },
];

const memberCollator = new Intl.Collator('ko', {
  numeric: true,
  sensitivity: 'base',
});

/**
 * The endpoint may return an ordinary request and an office-created record for
 * the same person. Keep every record, but draw one seat-ordered member row.
 */
export function buildAdminDailyLeaveMembers(
  statuses: DailyLeaveStatusResponse[],
): AdminDailyLeaveMember[] {
  const byMember = new Map<number, AdminDailyLeaveMember>();
  const repeatedKeys = new Map<string, number>();

  for (const status of statuses) {
    const member = byMember.get(status.memberId) ?? {
      memberId: status.memberId,
      name: status.name.trim() || '이름 없음',
      records: [],
      seatNumber: toSeatNumber(status.seatNumber),
    };
    const baseKey = [
      status.memberId,
      status.source,
      status.leaveType ?? 'NONE',
      status.label ?? 'NONE',
      status.createdAt ?? 'NONE',
    ].join(':');
    const occurrence = repeatedKeys.get(baseKey) ?? 0;

    repeatedKeys.set(baseKey, occurrence + 1);
    member.records.push(toLeaveRecord(status, `${baseKey}:${occurrence}`));
    byMember.set(status.memberId, member);
  }

  return [...byMember.values()]
    .map((member) => ({
      ...member,
      records: member.records.sort(compareRecords),
    }))
    .sort(compareMembers);
}

export function filterAdminDailyLeaveMembers(
  members: AdminDailyLeaveMember[],
  filter: AdminLeaveFilter,
  query: string,
) {
  const normalizedQuery = query.trim().toLocaleLowerCase('ko-KR');

  return members.flatMap((member) => {
    const searchText = [
      member.name,
      member.seatNumber === null ? '미배정' : String(member.seatNumber),
    ]
      .join(' ')
      .toLocaleLowerCase('ko-KR');

    if (normalizedQuery !== '' && !searchText.includes(normalizedQuery)) {
      return [];
    }

    const records =
      filter === 'ALL'
        ? member.records
        : member.records.filter((record) => record.category === filter);

    return records.length === 0 ? [] : [{ ...member, records }];
  });
}

export function summarizeAdminDailyLeaves(
  members: AdminDailyLeaveMember[],
): AdminDailyLeaveMetrics {
  const records = members.flatMap((member) => member.records);

  return {
    lateRequests: records.filter((record) => record.requestedAfterEight).length,
    officeEntries: records.filter(
      (record) =>
        record.sourceTone === 'office' || record.sourceTone === 'fixed',
    ).length,
    people: members.length,
    selfRequests: records.filter((record) => record.sourceTone === 'self')
      .length,
  };
}

export function countAdminLeaveRecords(
  members: AdminDailyLeaveMember[],
  filter: AdminLeaveFilter = 'ALL',
) {
  return members.reduce(
    (total, member) =>
      total +
      member.records.filter(
        (record) => filter === 'ALL' || record.category === filter,
      ).length,
    0,
  );
}

function toLeaveRecord(
  status: DailyLeaveStatusResponse,
  key: string,
): AdminDailyLeaveRecord {
  const source = toSource(status.source);

  return {
    category: toCategory(status),
    key,
    label: toRecordLabel(status),
    requestedAfterEight: status.requestedAfterEight === true,
    sourceLabel: source.label,
    sourceTone: source.tone,
  };
}

function toCategory(
  status: DailyLeaveStatusResponse,
): Exclude<AdminLeaveFilter, 'ALL'> {
  if (status.source === 'LEAVE') {
    return status.leaveType ?? 'OTHER';
  }

  /*
   * Office-created rows do not expose their period slots. Only the three
   * canonical labels are safe to classify; a custom reason must stay 기타
   * instead of inheriting the backend's lossy FULL fallback.
   */
  const label = status.label?.replace(/\s/g, '') ?? '';

  if (label === '월차') {
    return 'FULL';
  }

  if (label === '오전반차') {
    return 'MORNING';
  }

  if (label === '오후반차') {
    return 'AFTERNOON';
  }

  return 'OTHER';
}

function toRecordLabel(status: DailyLeaveStatusResponse) {
  const explicitLabel = status.label?.trim();

  if (explicitLabel) {
    return explicitLabel;
  }

  if (status.leaveType === 'FULL') {
    return '월차';
  }

  if (status.leaveType === 'MORNING') {
    return '오전 반차';
  }

  if (status.leaveType === 'AFTERNOON') {
    return '오후 반차';
  }

  return '휴무';
}

function toSource(source: string): {
  label: string;
  tone: AdminLeaveSourceTone;
} {
  if (source === 'LEAVE') {
    return { label: '본인 신청', tone: 'self' };
  }

  if (source === 'SPECIAL_LEAVE') {
    return { label: '지점 등록', tone: 'office' };
  }

  if (source === 'FIXED_LEAVE') {
    return { label: '고정 휴무', tone: 'fixed' };
  }

  return { label: '기타 등록', tone: 'other' };
}

function toSeatNumber(seatNumber: number | null) {
  return seatNumber !== null && Number.isInteger(seatNumber) && seatNumber > 0
    ? seatNumber
    : null;
}

function compareMembers(
  left: AdminDailyLeaveMember,
  right: AdminDailyLeaveMember,
) {
  if (left.seatNumber !== null && right.seatNumber !== null) {
    return (
      left.seatNumber - right.seatNumber ||
      memberCollator.compare(left.name, right.name)
    );
  }

  if (left.seatNumber !== null) {
    return -1;
  }

  if (right.seatNumber !== null) {
    return 1;
  }

  return memberCollator.compare(left.name, right.name);
}

function compareRecords(
  left: AdminDailyLeaveRecord,
  right: AdminDailyLeaveRecord,
) {
  return left.label.localeCompare(right.label, 'ko');
}
