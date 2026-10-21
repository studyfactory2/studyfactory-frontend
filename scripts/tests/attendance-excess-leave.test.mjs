import assert from 'node:assert/strict';
import test from 'node:test';
import {
  getActiveExcessLeaveRequests,
  getSlotExcessLeaveRequests,
  isExcessMemberLeaveCell,
} from '../../src/app/features/attendances/workspace/model/attendance-excess-leave.ts';

function request(overrides = {}) {
  return {
    leaveId: 12,
    leaveType: 'MORNING',
    label: '오전반차',
    slots: [1, 2, 3, 4],
    weeklyAllowance: {
      weekStart: '2026-10-19',
      weekEnd: '2026-10-25',
      allowanceUnits: 3,
      requestUnits: 1,
      usedUnitsBefore: 3,
      usedUnitsAfter: 4,
      totalUnits: 4,
      excess: true,
    },
    ...overrides,
  };
}

function memberLeaveCell(overrides = {}) {
  return {
    label: '오전',
    source: 'MEMBER_LEAVE',
    state: 'leave',
    ...overrides,
  };
}

test('missing metadata from an older server has no warning', () => {
  assert.deepEqual(getActiveExcessLeaveRequests(undefined), []);
  assert.deepEqual(getActiveExcessLeaveRequests(null), []);
  assert.deepEqual(getActiveExcessLeaveRequests([]), []);
  assert.deepEqual(getSlotExcessLeaveRequests([], 1), []);
  assert.equal(isExcessMemberLeaveCell(memberLeaveCell(), [], 1), false);
});

test('the server excess flag is authoritative, not a client units calculation', () => {
  const defaults = request().weeklyAllowance;
  const normalWithHighUnits = request({
    leaveId: 1,
    weeklyAllowance: {
      ...defaults,
      usedUnitsBefore: 99,
      usedUnitsAfter: 100,
      totalUnits: 100,
      excess: false,
    },
  });
  const excessWithLowUnits = request({
    leaveId: 2,
    weeklyAllowance: {
      ...defaults,
      usedUnitsBefore: 0,
      usedUnitsAfter: 1,
      totalUnits: 1,
      excess: true,
    },
  });
  assert.deepEqual(
    getActiveExcessLeaveRequests([normalWithHighUnits, excessWithLowUnits]),
    [excessWithLowUnits],
  );
});

test('absent or non-boolean excess metadata cannot create a warning', () => {
  const defaults = request().weeklyAllowance;
  assert.deepEqual(
    getActiveExcessLeaveRequests([
      request({ weeklyAllowance: undefined }),
      request({ weeklyAllowance: null }),
      request({ weeklyAllowance: { ...defaults, excess: false } }),
      request({ weeklyAllowance: { ...defaults, excess: 'true' } }),
    ]),
    [],
  );
});

test('requests with no effective period or only invalid periods are excluded', () => {
  assert.deepEqual(
    getActiveExcessLeaveRequests([
      request({ slots: [] }),
      request({ slots: [0, -1, 8, 1.5, Number.NaN, '1'] }),
    ]),
    [],
  );
  const valid = request({ slots: [0, 3, 8] });
  assert.deepEqual(getActiveExcessLeaveRequests([valid]), [valid]);
});

test('period lookup accepts only valid integer periods 1 through 7', () => {
  const warnings = [request({ slots: [0, 1, 4, 7, 8, 1.5] })];
  for (const slot of [0, -1, 8, 1.5, Number.NaN, '1']) {
    assert.deepEqual(getSlotExcessLeaveRequests(warnings, slot), []);
  }
  for (const slot of [1, 4, 7]) {
    assert.deepEqual(getSlotExcessLeaveRequests(warnings, slot), warnings);
  }
  for (const slot of [2, 3, 5, 6]) {
    assert.deepEqual(getSlotExcessLeaveRequests(warnings, slot), []);
  }
});

test('partial cancellation warns only on the remaining effective periods', () => {
  const partial = request({ slots: [3, 4] });
  assert.deepEqual(getActiveExcessLeaveRequests([partial]), [partial]);
  assert.deepEqual(getSlotExcessLeaveRequests([partial], 1), []);
  assert.deepEqual(getSlotExcessLeaveRequests([partial], 2), []);
  assert.deepEqual(getSlotExcessLeaveRequests([partial], 3), [partial]);
  assert.deepEqual(getSlotExcessLeaveRequests([partial], 4), [partial]);
  assert.equal(isExcessMemberLeaveCell(memberLeaveCell(), [partial], 2), false);
  assert.equal(isExcessMemberLeaveCell(memberLeaveCell(), [partial], 3), true);
});

test('overlapping excess requests retain separate identities and normal ones are excluded', () => {
  const morning = request({ leaveId: 11 });
  const afternoon = request({
    leaveId: 12,
    leaveType: 'AFTERNOON',
    label: '오후반차',
    slots: [4, 5, 6, 7],
  });
  const normal = request({
    leaveId: 13,
    weeklyAllowance: { ...morning.weeklyAllowance, excess: false },
  });
  const warnings = [morning, normal, afternoon];
  assert.deepEqual(getSlotExcessLeaveRequests(warnings, 1), [morning]);
  assert.deepEqual(getSlotExcessLeaveRequests(warnings, 4), [
    morning,
    afternoon,
  ]);
  assert.deepEqual(getSlotExcessLeaveRequests(warnings, 7), [afternoon]);
});

test('only MEMBER_LEAVE source cells receive excess leave styling', () => {
  const warnings = [request()];
  assert.equal(isExcessMemberLeaveCell(memberLeaveCell(), warnings, 1), true);
  for (const source of ['MANAGER_LEAVE', 'MANAGER_ABSENT', 'NONE']) {
    assert.equal(
      isExcessMemberLeaveCell(memberLeaveCell({ source }), warnings, 1),
      false,
    );
  }
});

test('O, X and unconfirmed states keep their appearance even with underlying requests', () => {
  const warnings = [request()];
  for (const [state, label] of [
    ['present', 'O'],
    ['absent', 'X'],
    ['unmarked', '—'],
  ]) {
    assert.equal(
      isExcessMemberLeaveCell(memberLeaveCell({ state, label }), warnings, 1),
      false,
    );
  }
  assert.equal(isExcessMemberLeaveCell(undefined, warnings, 1), false);
});

test('underlying warning metadata remains available beneath O and manager leave', () => {
  const excess = request();
  const warnings = getActiveExcessLeaveRequests([excess]);
  for (const cell of [
    { state: 'present', source: 'NONE', label: 'O' },
    { state: 'leave', source: 'MANAGER_LEAVE', label: '학교' },
  ]) {
    assert.equal(isExcessMemberLeaveCell(cell, warnings, 1), false);
    assert.deepEqual(getSlotExcessLeaveRequests(warnings, 1), [excess]);
    assert.deepEqual(warnings, [excess]);
  }
});

test('matching affected periods does not infer an exact request from the visible label', () => {
  const morning = request();
  const overlappingAfternoonLabel = memberLeaveCell({ label: '오후' });
  assert.equal(
    isExcessMemberLeaveCell(overlappingAfternoonLabel, [morning], 4),
    true,
  );
  assert.equal(
    isExcessMemberLeaveCell(overlappingAfternoonLabel, [morning], 5),
    false,
  );
});

test('warning projections do not mutate attendance, request order, periods or totals', () => {
  const first = request({ leaveId: 20, slots: [4, 2, 3] });
  const second = request({ leaveId: 10, slots: [1, 4] });
  for (const value of [first, second]) {
    Object.freeze(value.slots);
    Object.freeze(value.weeklyAllowance);
    Object.freeze(value);
  }
  const warnings = Object.freeze([first, second]);
  const cell = Object.freeze(memberLeaveCell());
  const snapshot = JSON.stringify({ warnings, cell });
  const active = getActiveExcessLeaveRequests(warnings);
  const matching = getSlotExcessLeaveRequests(warnings, 4);
  assert.deepEqual(active, [first, second]);
  assert.deepEqual(matching, [first, second]);
  assert.notEqual(active, warnings);
  assert.notEqual(matching, warnings);
  assert.equal(isExcessMemberLeaveCell(cell, warnings, 4), true);
  active.reverse();
  matching.pop();
  assert.equal(JSON.stringify({ warnings, cell }), snapshot);
});
