import assert from 'node:assert/strict';
import test from 'node:test';
import {
  leaveHistorySourceLabel,
  selectReasonCalendarDate,
  shortLeaveCalendarLabel,
} from '../../src/app/features/attendances/workspace/model/attendance-reason-calendar.ts';

function state(overrides = {}) {
  const value = {
    dates: ['2026-10-22'],
    inspectedDate: '2026-10-22',
    mode: 'select',
    ...overrides,
  };
  Object.freeze(value.dates);
  return Object.freeze(value);
}

test('select mode adds a date in chronological order without mutating the input', () => {
  const before = state({ dates: ['2026-11-01', '2026-10-22'] });
  const after = selectReasonCalendarDate(before, '2026-10-25', null);

  assert.deepEqual(after, {
    dates: ['2026-10-22', '2026-10-25', '2026-11-01'],
    inspectedDate: '2026-10-25',
    mode: 'select',
  });
  assert.notEqual(after, before);
  assert.notEqual(after.dates, before.dates);
  assert.deepEqual(before.dates, ['2026-11-01', '2026-10-22']);
  assert.equal(before.inspectedDate, '2026-10-22');
});

test('select mode deselects an existing date and keeps the remaining dates sorted', () => {
  const before = state({
    dates: ['2026-11-01', '2026-10-25', '2026-10-22'],
  });
  const after = selectReasonCalendarDate(before, '2026-10-25', null);

  assert.deepEqual(after.dates, ['2026-10-22', '2026-11-01']);
  assert.equal(after.inspectedDate, '2026-10-25');
  assert.equal(after.mode, 'select');
  assert.deepEqual(before.dates, ['2026-11-01', '2026-10-25', '2026-10-22']);
});

test('select mode allows the last selected date to be deselected', () => {
  const before = state();
  const after = selectReasonCalendarDate(before, '2026-10-22', null);

  assert.deepEqual(after.dates, []);
  assert.equal(after.inspectedDate, '2026-10-22');
  assert.deepEqual(before.dates, ['2026-10-22']);
});

test('history browsing changes only the inspected date, never the selected dates', () => {
  const before = state({
    mode: 'history',
    dates: ['2026-10-22', '2026-10-23'],
  });
  const after = selectReasonCalendarDate(before, '2026-10-23', null);

  assert.deepEqual(after, { ...before, inspectedDate: '2026-10-23' });
  assert.notEqual(after, before);
  assert.equal(after.dates, before.dates);
  assert.equal(before.inspectedDate, '2026-10-22');
});

test('history browsing can inspect an unselected date before joining and at the selection cap', () => {
  const before = state({ mode: 'history' });
  const after = selectReasonCalendarDate(before, '2026-09-01', '2026-10-01', 1);

  assert.deepEqual(after, { ...before, inspectedDate: '2026-09-01' });
  assert.equal(after.dates, before.dates);
});

test('switching back from history does not lose the dates selected for a request', () => {
  const initial = state({ dates: ['2026-10-22', '2026-10-24'] });
  const browsed = selectReasonCalendarDate(
    state({ ...initial, mode: 'history' }),
    '2026-10-15',
    null,
  );
  const after = selectReasonCalendarDate(
    state({ ...browsed, mode: 'select' }),
    '2026-10-23',
    null,
  );

  assert.deepEqual(after.dates, ['2026-10-22', '2026-10-23', '2026-10-24']);
  assert.deepEqual(initial.dates, ['2026-10-22', '2026-10-24']);
});

test('a pre-join date can be inspected but cannot be newly selected', () => {
  const before = state();
  const after = selectReasonCalendarDate(before, '2026-10-20', '2026-10-21');

  assert.equal(after.dates, before.dates);
  assert.equal(after.inspectedDate, '2026-10-20');
  assert.equal(after.mode, 'select');
  assert.equal(before.inspectedDate, '2026-10-22');
});

test('selection is allowed on the join date itself', () => {
  const after = selectReasonCalendarDate(state(), '2026-10-21', '2026-10-21');

  assert.deepEqual(after.dates, ['2026-10-21', '2026-10-22']);
});

test('a null join date imposes no lower selection boundary', () => {
  const after = selectReasonCalendarDate(state(), '2025-12-31', null);

  assert.deepEqual(after.dates, ['2025-12-31', '2026-10-22']);
});

test('an already selected pre-join date may still be deselected', () => {
  const before = state({ dates: ['2026-10-20', '2026-10-22'] });
  const after = selectReasonCalendarDate(before, '2026-10-20', '2026-10-21', 2);

  assert.deepEqual(after.dates, ['2026-10-22']);
  assert.equal(after.inspectedDate, '2026-10-20');
  assert.deepEqual(before.dates, ['2026-10-20', '2026-10-22']);
});

test('selection is allowed up to the configured cap and rejected above it', () => {
  const atCap = selectReasonCalendarDate(state(), '2026-10-23', null, 2);
  const after = selectReasonCalendarDate(state(atCap), '2026-10-24', null, 2);

  assert.deepEqual(atCap.dates, ['2026-10-22', '2026-10-23']);
  assert.equal(after.dates, atCap.dates);
  assert.equal(after.inspectedDate, '2026-10-24');
  assert.equal(atCap.inspectedDate, '2026-10-23');
});

test('the default selection cap is 31 dates', () => {
  const dates = Array.from(
    { length: 30 },
    (_, index) => `2026-10-${String(index + 1).padStart(2, '0')}`,
  );
  const atCap = selectReasonCalendarDate(state({ dates }), '2026-10-31', null);
  const after = selectReasonCalendarDate(state(atCap), '2026-11-01', null);

  assert.equal(atCap.dates.length, 31);
  assert.equal(atCap.dates.at(-1), '2026-10-31');
  assert.equal(after.dates, atCap.dates);
  assert.equal(after.inspectedDate, '2026-11-01');
  assert.equal(dates.length, 30);
});

test('deselection remains possible even when current selection exceeds the cap', () => {
  const before = state({ dates: ['2026-10-22', '2026-10-23'] });
  const after = selectReasonCalendarDate(before, '2026-10-22', null, 1);

  assert.deepEqual(after.dates, ['2026-10-23']);
  assert.equal(after.inspectedDate, '2026-10-22');
});

test('a zero selection cap allows inspection but no new selection', () => {
  const before = state({ dates: [] });
  const after = selectReasonCalendarDate(before, '2026-10-23', null, 0);

  assert.equal(after.dates, before.dates);
  assert.equal(after.inspectedDate, '2026-10-23');
});

test('calendar labels shorten only the exact morning and afternoon half-day names', () => {
  assert.equal(shortLeaveCalendarLabel('오전반차'), '오전');
  assert.equal(shortLeaveCalendarLabel('오후반차'), '오후');

  for (const label of [
    '학교',
    '알바',
    '월차',
    '오전',
    '오후',
    '',
    ' 오전반차 ',
  ]) {
    assert.equal(shortLeaveCalendarLabel(label), label);
  }
});

test('history source badges distinguish administrator and personal schedules only', () => {
  assert.equal(leaveHistorySourceLabel('SPECIAL_LEAVE'), '관리자등록');
  assert.equal(leaveHistorySourceLabel('FIXED_LEAVE'), '개인일정');
  assert.equal(leaveHistorySourceLabel('MEMBER_LEAVE'), null);
  assert.equal(leaveHistorySourceLabel(null), null);
  assert.equal(leaveHistorySourceLabel(undefined), null);
});
