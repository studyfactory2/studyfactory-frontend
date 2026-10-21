import assert from 'node:assert/strict';
import test from 'node:test';
import {
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

for (const cell of cells) {
  test(`RESTORE is allowed from ${cell.state}/${cell.label}, including hidden leave`, () => {
    assert.equal(canSubmitAttendanceStatus(cell, 'RESTORE'), true);
  });
}

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
  assert.equal(canSubmitAttendanceStatus(cells[2], 'RESTORE'), true);
  for (const cell of cells.slice(1)) {
    assert.equal(canSubmitAttendanceStatus(cell, 'PRESENT'), true);
  }
});

test('action decisions never mutate the server cell or guess a restored label', () => {
  for (const cell of cells) {
    const frozen = Object.freeze({ ...cell });
    attendanceActivationStatus(frozen);
    canSubmitAttendanceStatus(frozen, 'RESTORE');
    assert.deepEqual(frozen, cell);
  }
});
