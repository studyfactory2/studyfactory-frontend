import assert from 'node:assert/strict';
import test from 'node:test';
import {
  filterAttendanceMembers,
  filterAttendanceVacancies,
} from '../../src/app/features/attendances/workspace/model/attendance-board-filters.ts';

function freeze(value) {
  if (value && typeof value === 'object') {
    for (const child of Object.values(value)) freeze(child);
    Object.freeze(value);
  }
  return value;
}

function member(memberId, overrides = {}) {
  return freeze({
    memberId,
    name: `회원${memberId}`,
    seatNumber: memberId,
    role: 'MEMBER',
    stage: 'active',
    joinDate: '2026-10-01',
    presence: null,
    excessLeaveRequests: [],
    slots: slots(),
    ...overrides,
  });
}

function slots(unmarked = [], fill = 'present') {
  const labels = { present: 'O', absent: 'X', leave: '오전', unmarked: '—' };
  return freeze(
    Array.from({ length: 7 }, (_, index) => {
      const state = unmarked.includes(index + 1) ? 'unmarked' : fill;
      return { state, label: labels[state], source: 'NONE' };
    }),
  );
}

function options(overrides = {}) {
  return freeze({
    filter: 'all',
    query: '',
    selectedMemberId: null,
    isToday: true,
    interactive: true,
    activeSlot: 3,
    operationalSlot: 3,
    ...overrides,
  });
}

function ids(members, overrides = {}) {
  return filterAttendanceMembers(members, options(overrides)).map(
    (item) => item.memberId,
  );
}

const roster = freeze([
  member(1, { name: '김서연' }),
  member(2, { slots: slots([], 'absent') }),
  member(3, { slots: slots([], 'leave') }),
  member(4, { slots: slots([1, 2, 3, 4, 5, 6, 7]) }),
  member(5, { seatNumber: null, name: '미배정회원' }),
  member(6, { role: 'STAFF', name: 'John 스태프' }),
  member(7, { stage: 'starts-today' }),
  member(8, { stage: 'future' }),
  member(9, { name: '공석', seatNumber: null }),
]);

test('hide-vacant preserves every real member and their order just like all', () => {
  const expected = roster.map((item) => item.memberId);
  assert.deepEqual(ids(roster), expected);
  assert.deepEqual(ids(roster, { filter: 'hide-vacant' }), expected);
});

test('hide-vacant never treats an unseated person or a name as a vacancy', () => {
  assert.deepEqual(
    ids(roster, { filter: 'hide-vacant', query: '미배정' }),
    [5, 9],
  );
  assert.deepEqual(ids(roster, { filter: 'hide-vacant', query: '공석' }), [9]);
});

for (const filter of ['all', 'hide-vacant']) {
  test(`${filter} preserves trimmed, case-insensitive name and seat search`, () => {
    assert.deepEqual(ids(roster, { filter, query: '  김서연  ' }), [1]);
    assert.deepEqual(ids(roster, { filter, query: ' JOHN ' }), [6]);
    assert.deepEqual(ids(roster, { filter, query: ' 3 ' }), [3]);
    assert.deepEqual(ids(roster, { filter, query: '없는이름' }), []);
    assert.deepEqual(
      ids(roster, { filter, query: '   ' }),
      roster.map((item) => item.memberId),
    );
  });
}

test('member seat search remains substring-based and does not search member IDs', () => {
  const members = freeze([
    member(900, { name: '가람', seatNumber: 12 }),
    member(901, { name: '나래', seatNumber: 21 }),
    member(902, { name: '다온', seatNumber: null }),
  ]);
  assert.deepEqual(
    ids(members, { filter: 'hide-vacant', query: '2' }),
    [900, 901],
  );
  assert.deepEqual(ids(members, { filter: 'hide-vacant', query: '900' }), []);
});

test('today interactive unmarked uses the operational period, not any blank period', () => {
  const members = freeze([
    member(1, { slots: slots([3]) }),
    member(2, { slots: slots([1]) }),
    member(3, { slots: slots([7]) }),
    member(4, { slots: slots([], 'leave') }),
    member(5, { slots: slots([], 'absent') }),
  ]);
  assert.deepEqual(ids(members, { filter: 'unmarked', activeSlot: 2 }), [1]);
});

test('unmarked excludes starts-today and future stages unless explicitly selected', () => {
  const members = freeze([
    member(1, { slots: slots([3]) }),
    member(2, { slots: slots([3]), stage: 'starts-today' }),
    member(3, { slots: slots([3]), stage: 'future' }),
  ]);
  assert.deepEqual(ids(members, { filter: 'unmarked' }), [1]);
  assert.deepEqual(
    ids(members, { filter: 'unmarked', selectedMemberId: 3 }),
    [1, 3],
  );
});

test('selected members stay pinned in unmarked only while matching the search', () => {
  assert.deepEqual(
    ids(roster, { filter: 'unmarked', selectedMemberId: 3 }),
    [3, 4],
  );
  assert.deepEqual(
    ids(roster, { filter: 'unmarked', selectedMemberId: 3, query: '회원4' }),
    [4],
  );
  assert.deepEqual(
    ids(roster, { filter: 'unmarked', selectedMemberId: 3, query: '없음' }),
    [],
  );
});

test('today interactive with no active period includes only a pinned matching member', () => {
  assert.deepEqual(ids(roster, { filter: 'unmarked', activeSlot: null }), []);
  assert.deepEqual(
    ids(roster, {
      filter: 'unmarked',
      activeSlot: null,
      selectedMemberId: 6,
    }),
    [6],
  );
});

test('interactive operational-slot fallback remains period seven', () => {
  const members = freeze([
    member(1, { slots: slots([3]) }),
    member(2, { slots: slots([7]) }),
  ]);
  assert.deepEqual(
    ids(members, { filter: 'unmarked', operationalSlot: null }),
    [2],
  );
});

test('historical unmarked scans all seven periods regardless of interactive mode', () => {
  const members = freeze([
    member(1, { slots: slots([1]) }),
    member(2, { slots: slots([7]) }),
    member(3),
    member(4, { slots: slots([7]), stage: 'future' }),
  ]);
  for (const interactive of [true, false]) {
    assert.deepEqual(
      ids(members, {
        filter: 'unmarked',
        isToday: false,
        interactive,
        activeSlot: null,
      }),
      [1, 2],
    );
  }
});

test('today read-only unmarked scans only through the active period', () => {
  const members = freeze([
    member(1, { slots: slots([1]) }),
    member(2, { slots: slots([2]) }),
    member(3, { slots: slots([3]) }),
    member(4, { slots: slots([7]) }),
  ]);
  assert.deepEqual(
    ids(members, { filter: 'unmarked', interactive: false, activeSlot: 2 }),
    [1, 2],
  );
  assert.deepEqual(
    ids(members, {
      filter: 'unmarked',
      interactive: false,
      activeSlot: null,
    }),
    [],
  );
});

test('today read-only after operational periods scans all seven slots', () => {
  const members = freeze([member(1, { slots: slots([7]) }), member(2)]);
  assert.deepEqual(
    ids(members, {
      filter: 'unmarked',
      interactive: false,
      activeSlot: null,
      operationalSlot: null,
    }),
    [1],
  );
});

test('all and hide-vacant ignore active period and interactive timing restrictions', () => {
  for (const filter of ['all', 'hide-vacant']) {
    for (const isToday of [true, false]) {
      assert.deepEqual(
        ids(roster, {
          filter,
          isToday,
          interactive: false,
          activeSlot: null,
          operationalSlot: null,
        }),
        roster.map((item) => item.memberId),
      );
    }
  }
});

const vacancies = freeze([102, 4, 103, 1, 24, 101]);
function vacancyOptions(overrides = {}) {
  return freeze({
    filter: 'all',
    branchName: '망미점',
    query: '',
    ...overrides,
  });
}

test('all preserves vacancy order but caps the Mangmi seat layout at 102', () => {
  assert.deepEqual(
    filterAttendanceVacancies(vacancies, vacancyOptions()),
    [102, 4, 1, 24, 101],
  );
  assert.deepEqual(
    filterAttendanceVacancies(
      vacancies,
      vacancyOptions({ branchName: ' 망미점 ' }),
    ),
    [102, 4, 1, 24, 101],
  );
});

test('hide-vacant and unmarked never render vacant-seat rows', () => {
  for (const filter of ['hide-vacant', 'unmarked']) {
    for (const query of ['', '공석', '102']) {
      assert.deepEqual(
        filterAttendanceVacancies(vacancies, vacancyOptions({ filter, query })),
        [],
      );
    }
  }
});

test('vacancies remain restricted to the exact trimmed Mangmi branch name', () => {
  for (const branchName of [null, undefined, '', '연산점', '망미', '망미점2']) {
    assert.deepEqual(
      filterAttendanceVacancies(vacancies, vacancyOptions({ branchName })),
      [],
    );
  }
});

test('vacancy search preserves trimmed numeric substring and 공석 matching', () => {
  assert.deepEqual(
    filterAttendanceVacancies(vacancies, vacancyOptions({ query: ' 1 ' })),
    [102, 1, 101],
  );
  assert.deepEqual(
    filterAttendanceVacancies(vacancies, vacancyOptions({ query: '24' })),
    [24],
  );
  assert.deepEqual(
    filterAttendanceVacancies(vacancies, vacancyOptions({ query: ' 공석 ' })),
    [102, 4, 1, 24, 101],
  );
  assert.deepEqual(
    filterAttendanceVacancies(vacancies, vacancyOptions({ query: '공' })),
    [102, 4, 1, 24, 101],
  );
  assert.deepEqual(
    filterAttendanceVacancies(vacancies, vacancyOptions({ query: '회원' })),
    [],
  );
});

test('filter projections never mutate frozen members, slots, options, or vacancies', () => {
  const memberSnapshot = JSON.stringify(roster);
  const vacancySnapshot = JSON.stringify(vacancies);
  for (const filter of ['all', 'unmarked', 'hide-vacant']) {
    const memberOptions = options({ filter });
    const vacantOptions = vacancyOptions({ filter });
    const optionSnapshot = JSON.stringify([memberOptions, vacantOptions]);
    const result = filterAttendanceMembers(roster, memberOptions);
    for (const item of result) {
      assert.equal(
        item,
        roster.find((member) => member.memberId === item.memberId),
      );
      assert.equal(
        item.slots,
        roster.find((member) => member.memberId === item.memberId).slots,
      );
    }
    filterAttendanceVacancies(vacancies, vacantOptions);
    assert.equal(
      JSON.stringify([memberOptions, vacantOptions]),
      optionSnapshot,
    );
  }
  assert.equal(JSON.stringify(roster), memberSnapshot);
  assert.equal(JSON.stringify(vacancies), vacancySnapshot);
});
