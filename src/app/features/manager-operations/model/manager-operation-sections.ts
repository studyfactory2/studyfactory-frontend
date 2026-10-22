import {
  readManagerLeaveRoute,
  removeManagerLeaveSearch,
} from '../../manager-leaves/manager-leave-route.ts';

const STAFF_SECTIONS = [
  'work',
  'leave',
  'member-leave',
  'meals',
  'schedule',
  'seats',
] as const;

export type StaffOperationsSection = (typeof STAFF_SECTIONS)[number];
export type AdminOperationsSection = 'overview' | 'leaves' | 'qr';

export function readStaffOperationsSection(
  searchParams: URLSearchParams,
): StaffOperationsSection {
  // Existing member/date/period links take priority over a general section.
  if (readManagerLeaveRoute(searchParams) !== null) return 'member-leave';

  const requested = searchParams.get('section');
  return STAFF_SECTIONS.find((section) => section === requested) ?? 'work';
}

export function withStaffOperationsSection(
  searchParams: URLSearchParams,
  section: StaffOperationsSection,
) {
  const next = removeManagerLeaveSearch(searchParams);
  next.set('section', section);
  return next;
}

export function readAdminOperationsSection(
  searchParams: URLSearchParams,
): AdminOperationsSection {
  if (readManagerLeaveRoute(searchParams) !== null) return 'leaves';

  const requested = searchParams.get('section');
  return requested === 'leaves' || requested === 'qr' ? requested : 'overview';
}

export function withAdminOperationsOverview(searchParams: URLSearchParams) {
  const next = removeManagerLeaveSearch(searchParams);
  next.delete('section');
  return next;
}
