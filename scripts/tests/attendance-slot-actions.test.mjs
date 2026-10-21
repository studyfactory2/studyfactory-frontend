import assert from 'node:assert/strict';
import test from 'node:test';
import {
  attendanceAbsenceStatus,
  attendanceActivationStatus,
  canSubmitAttendanceStatus,
} from '../../src/app/features/attendances/workspace/model/attendance-slot-actions.ts';

const cells = [
  { label: 'O', source: 'NONE', state: 'present' },
  { label: '—', source: 'NONE', state: 'unmarked' },
  { label: 'X', source: 'MANAGER_ABSENT', state: 'absent' },
  { label: '오전', source: 'MEMBER_LEAVE', state: 'leave' },
  { label: '오후', source: 'MEMBER_LEAVE', state: 'leave' },
  { label: '학교', source: 'MANAGER_LEAVE', state: 'leave' },
];

const expectedAbsenceStatuses = [
  'RESTORE',
  'MARK_ABSENT',
  null,
  'MARK_ABSENT',
  'MARK_ABSENT',
  'MARK_ABSENT',
];
for (const [index, cell] of cells.entries()) {
  test(`X sends ${expectedAbsenceStatuses[index] ?? 'no command'} from ${cell.state}/${cell.label}`, () => {
    assert.equal(attendanceAbsenceStatus(cell), expectedAbsenceStatuses[index]);
    assert.equal(
      canSubmitAttendanceStatus(cell, 'RESTORE'),
      expectedAbsenceStatuses[index] === 'RESTORE',
    );
    assert.equal(
      canSubmitAttendanceStatus(cell, 'MARK_ABSENT'),
      expectedAbsenceStatuses[index] === 'MARK_ABSENT',
    );
  });
}

test('a persisted blank from tapping O restores leave, unlike an ordinary blank', () => {
  const cleared = { ...cells[1], clearedPresent: true };
  assert.equal(attendanceAbsenceStatus(cleared), 'RESTORE');
  assert.equal(canSubmitAttendanceStatus(cleared, 'RESTORE'), true);
  assert.equal(canSubmitAttendanceStatus(cleared, 'MARK_ABSENT'), false);
  assert.equal(attendanceActivationStatus(cleared), null);
  assert.equal(
    attendanceAbsenceStatus({ ...cells[1], clearedPresent: false }),
    'MARK_ABSENT',
  );
});

test('stale cleared metadata cannot turn a current leave or reviewed X into restore', () => {
  assert.equal(
    attendanceAbsenceStatus({ ...cells[3], clearedPresent: true }),
    'MARK_ABSENT',
  );
  assert.equal(
    attendanceAbsenceStatus({ ...cells[2], clearedPresent: true }),
    null,
  );
});

test('tapping O still clears only that period to UNCONFIRMED', () => {
  assert.equal(attendanceActivationStatus(cells[0]), 'UNCONFIRMED');
});

test('tapping a blank, X, or leave only selects it without mutating attendance', () => {
  for (const cell of cells.slice(1)) {
    assert.equal(attendanceActivationStatus(cell), null);
  }
});

test('UNCONFIRMED is allowed only for an O, not a restored leave or blank', () => {
  for (const cell of cells) {
    assert.equal(
      canSubmitAttendanceStatus(cell, 'UNCONFIRMED'),
      cell.state === 'present',
    );
  }
});

test('duplicate PRESENT remains blocked, while legacy ABSENT is not used as RESTORE', () => {
  assert.equal(canSubmitAttendanceStatus(cells[0], 'PRESENT'), false);
  assert.equal(canSubmitAttendanceStatus(cells[2], 'ABSENT'), false);
  assert.equal(canSubmitAttendanceStatus(cells[2], 'RESTORE'), false);
  assert.equal(canSubmitAttendanceStatus(cells[2], 'MARK_ABSENT'), false);
  for (const cell of cells.slice(1)) {
    assert.equal(canSubmitAttendanceStatus(cell, 'PRESENT'), true);
  }
});

test('action decisions never mutate the server cell or guess a restored label', () => {
  for (const cell of cells) {
    const frozen = Object.freeze({ ...cell });
    attendanceActivationStatus(frozen);
    attendanceAbsenceStatus(frozen);
    canSubmitAttendanceStatus(frozen, 'RESTORE');
    assert.deepEqual(frozen, cell);
  }
});
