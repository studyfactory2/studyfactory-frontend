import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { memberRoutes } from '../../src/app/core/router/routes.ts';
import {
  getHomeBeverageLabel,
  getHomeLeaveLabel,
  getHomeStudySummary,
} from '../../src/app/screens/member/home/model/home.summary.ts';

function source(path) {
  return readFileSync(
    new URL(`../../src/app/${path}`, import.meta.url),
    'utf8',
  );
}

function duration(totalSeconds) {
  return { totalSeconds };
}

function drink(name, id = 1) {
  return { id, name, note: null };
}

test('missing study report remains unknown rather than claiming zero study', () => {
  assert.deepEqual(getHomeStudySummary(undefined), {
    asOf: null,
    recognizedSeconds: null,
    recognizedPeriodSeconds: null,
    recognizedBreakSeconds: null,
  });
});

test('study summary displays exact server totals and timestamp without recomputing days', () => {
  // Deliberately different day data catches a display helper that resums
  // periods or omits the four short breaks instead of using report totals.
  const report = Object.freeze({
    asOf: '2026-10-26T12:32:17+09:00',
    totals: Object.freeze({
      totalRecognizedStudyDuration: Object.freeze(duration(10037)),
      recognizedPeriodDuration: Object.freeze(duration(9300)),
      recognizedBreakDuration: Object.freeze(duration(737)),
    }),
    days: [{ periods: [], breaks: [] }],
  });

  assert.deepEqual(getHomeStudySummary(report), {
    asOf: report.asOf,
    recognizedSeconds: 10037,
    recognizedPeriodSeconds: 9300,
    recognizedBreakSeconds: 737,
  });
});

test('a valid zero-valued report stays distinct from an unavailable report', () => {
  assert.deepEqual(
    getHomeStudySummary({
      asOf: '2026-10-26T08:00:00+09:00',
      totals: {
        totalRecognizedStudyDuration: duration(0),
        recognizedPeriodDuration: duration(0),
        recognizedBreakDuration: duration(0),
      },
    }),
    {
      asOf: '2026-10-26T08:00:00+09:00',
      recognizedSeconds: 0,
      recognizedPeriodSeconds: 0,
      recognizedBreakSeconds: 0,
    },
  );
});

test('beverage shortcut keeps every registered name, original order and duplicate drinks', () => {
  const items = Object.freeze([
    Object.freeze(drink(' 선식반컵 ', 1)),
    Object.freeze(drink('아아', 2)),
    Object.freeze(drink('아아', 3)),
    Object.freeze(drink('차가운 보리차 (얼음 없이)', 4)),
  ]);

  assert.equal(
    getHomeBeverageLabel({ errorMessage: null, items, loading: false }),
    '선식반컵 · 아아 · 아아 · 차가운 보리차 (얼음 없이)',
  );
  assert.equal(items[0].name, ' 선식반컵 ');
});

test('beverage shortcut ignores blank names and labels a genuine empty result', () => {
  for (const items of [[], [drink(''), drink('   ')]]) {
    assert.equal(
      getHomeBeverageLabel({ errorMessage: null, items, loading: false }),
      '등록한 음료 없음',
    );
  }

  assert.equal(
    getHomeBeverageLabel({
      errorMessage: null,
      items: [drink(''), drink('물', 2), drink('  ', 3)],
      loading: false,
    }),
    '물',
  );
});

test('beverage loading and errors do not masquerade as an empty preference', () => {
  assert.equal(
    getHomeBeverageLabel({ errorMessage: null, items: [], loading: true }),
    '불러오는 중',
  );
  for (const items of [[], [drink('과거 캐시 음료')]]) {
    assert.equal(
      getHomeBeverageLabel({
        errorMessage: '연결 실패',
        items,
        loading: false,
      }),
      '확인 필요',
    );
  }
});

test('leave shortcut uses the supplied date and label without shifting timezones', () => {
  for (const [leaveDate, label, expected] of [
    ['2026-01-02', '오전반차', '1/2 오전반차'],
    ['2026-10-30', '오후반차', '10/30 오후반차'],
    ['2027-01-01', '월차', '1/1 월차'],
  ]) {
    assert.equal(
      getHomeLeaveLabel({
        errorMessage: null,
        loading: false,
        upcoming: { leaveDate, label },
      }),
      expected,
    );
  }
});

test('leave empty, loading and failure messages are distinct', () => {
  assert.equal(
    getHomeLeaveLabel({
      errorMessage: null,
      loading: false,
      upcoming: null,
    }),
    '예정된 휴무 없음',
  );
  assert.equal(
    getHomeLeaveLabel({ errorMessage: null, loading: true, upcoming: null }),
    '불러오는 중',
  );
  for (const upcoming of [
    null,
    { leaveDate: '2026-10-30', label: '오후반차' },
  ]) {
    assert.equal(
      getHomeLeaveLabel({
        errorMessage: '연결 실패',
        loading: false,
        upcoming,
      }),
      '확인 필요',
    );
  }
});

test('five shortcut destinations retain their existing MEMBER-only routes', () => {
  assert.deepEqual(
    [
      memberRoutes.moreLeaves,
      memberRoutes.moreSideDishes,
      memberRoutes.moreBeverages,
      memberRoutes.moreSuggestions,
      memberRoutes.moreProfile,
    ],
    [
      '/member/more/leaves',
      '/member/more/side-dishes',
      '/member/more/beverages',
      '/member/more/suggestions',
      '/member/more/profile',
    ],
  );

  const router = source('core/router/AppRouter.tsx');
  const marker =
    "<Route element={<ProtectedRoute allowedRoles={['MEMBER']} />}>";
  const start = router.indexOf(marker);
  assert.notEqual(start, -1, 'Member routes must retain their role guard');
  const end = router.indexOf('<Route element={<ProtectedRoute', start + 1);
  const memberBlock = router.slice(start, end === -1 ? router.length : end);
  assert.match(memberBlock, /path="more"/);
  for (const path of [
    'leaves',
    'side-dishes',
    'beverages',
    'suggestions',
    'profile',
  ]) {
    assert.ok(memberBlock.includes(`path="${path}"`));
  }
});

test('member home retains identity guard, remount key and owner-bound data hook', () => {
  const screen = source('screens/member/home/MemberHomeScreen.tsx');
  assert.match(
    screen,
    /if\s*\(memberId === null \|\| branchId === null \|\| ownerKey === null\)/,
  );
  assert.match(screen, /key=\{ownerKey\}/);
  assert.match(screen, /queryOwnerKey=\{ownerKey\}/);
  assert.match(screen, /useMemberHome\(memberId, branchId, queryOwnerKey\)/);
});

test('QR still uses scanner, token validation, original submit and pending guard', () => {
  const qr = source('screens/member/home/components/HomeQrPresence.tsx');
  const screen = source('screens/member/home/MemberHomeScreen.tsx');
  assert.match(qr, /if \(!loading\)\s*\{\s*setOpen\(false\)/);
  assert.match(qr, /await onSubmit\(qrToken\)/);
  assert.match(qr, /parseStudyPresenceQrToken\(result\.getText\(\)\)/);
  assert.match(qr, /reader\.decodeFromConstraints\(/);
  assert.match(screen, /action=\{home\.attendance\.action\}/);
  assert.match(screen, /onSubmit=\{home\.attendance\.onSubmit\}/);
});

test('break study retains visibility rules and server-authorized start/stop controls', () => {
  const component = source('screens/member/home/components/HomeBreakStudy.tsx');
  assert.match(component, /if \(!checkedIn\)\s*\{\s*return null;/);
  assert.match(
    component,
    /if \(!status \|\| \(!status\.currentBreak && !status\.active\)\)/,
  );
  assert.match(component, /active \? !status\.canStop : !status\.canStart/);
  assert.match(component, /active \? onStop\(\) : onStart\(\)/);
  assert.match(component, /disabled=\{actionDisabled\}/);
  assert.match(component, /loading=\{actionLoading\}/);
  assert.match(component, /useLiveElapsedSeconds\(/);
});

test('home keeps existing QR and break mutation contracts', () => {
  const hook = source('screens/member/home/hooks/useMemberHome.ts');
  assert.match(
    hook,
    /submitStudyPresenceQr\(action, qrToken, memberId, branchId\)/,
  );
  assert.match(hook, /action: checkedIn \? 'checkOut' : 'checkIn'/);
  assert.match(hook, /startMyBreakStudy\(memberId, branchId\)/);
  assert.match(hook, /stopMyBreakStudy\(memberId, branchId\)/);
  assert.match(hook, /queryKey: studyTimeQueryKeys\.reports\(ownerKey\)/);
});

test('slice one does not wire shared-checklist or weekly-plan writes into home', () => {
  const homeSources = [
    source('screens/member/home/MemberHomeScreen.tsx'),
    source('screens/member/home/hooks/useMemberHome.ts'),
    source('screens/member/home/components/HomeTodayPlan.tsx'),
  ].join('\n');

  assert.doesNotMatch(
    homeSources,
    /\b(?:saveWeeklyPlan|saveMonthlyPlanGoal|useMemberPlans)\b/,
  );
  assert.doesNotMatch(
    homeSources,
    /\b(?:useSharedChecklist|useMemberTasks|useMemberTodos)\b/,
  );
  assert.match(homeSources, /<HomeTodayPlan\b/);
});
