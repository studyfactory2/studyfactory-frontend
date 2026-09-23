import assert from 'node:assert/strict';
import test from 'node:test';
import {
  findAttendanceTarget,
  selectAttendanceRoster,
} from '../src/app/features/attendances/workspace/model/attendance-targets.ts';

const branchId = 1;

function member(overrides = {}) {
  return {
    id: 42,
    branchId,
    name: '테스트 사원',
    role: 'MEMBER',
    seatNumber: 7,
    joinDate: '2026-09-01',
    certificationId: null,
    preparingCertifications: null,
    createdAt: null,
    updatedAt: null,
    ...overrides,
  };
}

function row(person, overrides = {}) {
  return {
    joinDate: person.joinDate,
    memberId: person.id,
    name: person.name,
    presence: null,
    role: person.role,
    seatNumber: person.seatNumber,
    slots: Array.from({ length: 7 }, () => ({
      label: '—',
      source: 'NONE',
      state: 'unmarked',
    })),
    stage: 'active',
    ...overrides,
  };
}

test('attendance roster includes seated and unassigned students and staff in the selected branch', () => {
  const student = member();
  const staff = member({ id: 43, role: 'STAFF', seatNumber: null });
  const admin = member({ id: 44, role: 'ADMIN' });
  const otherBranchStudent = member({ id: 45, branchId: 2 });
  const otherBranchStaff = member({ id: 46, branchId: 2, role: 'STAFF' });
  const roster = [student, admin, otherBranchStudent, staff, otherBranchStaff];

  assert.deepEqual(selectAttendanceRoster(roster, branchId), [student, staff]);
  assert.deepEqual(selectAttendanceRoster(roster, 2), [
    otherBranchStudent,
    otherBranchStaff,
  ]);
  assert.equal(roster.length, 5);
});

test('explicitly excluded pending accounts stay out regardless of student or staff role', () => {
  const student = member();
  const staff = member({ id: 43, role: 'STAFF' });
  const currentStaff = member({ id: 44, role: 'STAFF', seatNumber: null });

  assert.deepEqual(
    selectAttendanceRoster(
      [student, staff, currentStaff],
      branchId,
      new Set([student.id, staff.id]),
    ),
    [currentStaff],
  );
});

test('missing roster remains unresolved while an empty or nonmatching roster is empty', () => {
  assert.equal(selectAttendanceRoster(undefined, branchId), undefined);
  assert.deepEqual(selectAttendanceRoster([], branchId), []);
  assert.deepEqual(selectAttendanceRoster([member()], 2), []);
});

test('current students and unassigned staff can both be active attendance targets', () => {
  for (const person of [
    member(),
    member({ id: 43, role: 'STAFF', seatNumber: null }),
  ]) {
    const boardRow = row(person);

    assert.equal(
      findAttendanceTarget([person], [boardRow], branchId, person.id, 'active'),
      boardRow,
    );
  }
});

test('a removed roster account or a missing board row invalidates an old target', () => {
  const staff = member({ role: 'STAFF' });
  const boardRow = row(staff);

  assert.equal(
    findAttendanceTarget([], [boardRow], branchId, staff.id, 'active'),
    null,
  );
  assert.equal(
    findAttendanceTarget([staff], [], branchId, staff.id, 'active'),
    null,
  );
  assert.equal(
    findAttendanceTarget([staff], [boardRow], branchId, 999, 'active'),
    null,
  );
});

test('a matching board row cannot authorize a different branch or an admin account', () => {
  for (const person of [
    member({ branchId: 2 }),
    member({ branchId: 2, role: 'STAFF' }),
    member({ role: 'ADMIN' }),
  ]) {
    assert.equal(
      findAttendanceTarget(
        [person],
        [row(person)],
        branchId,
        person.id,
        'active',
      ),
      null,
    );
  }
});

test('a role change invalidates an already displayed attendance target', () => {
  for (const [previousRole, currentRole] of [
    ['MEMBER', 'STAFF'],
    ['STAFF', 'MEMBER'],
    ['STAFF', 'ADMIN'],
  ]) {
    const previous = member({ role: previousRole });
    const current = { ...previous, role: currentRole };

    assert.equal(
      findAttendanceTarget(
        [current],
        [row(previous)],
        branchId,
        current.id,
        'active',
      ),
      null,
    );
  }
});

test('attendance editing and start/reset each require their exact row stage', () => {
  const staff = member({ role: 'STAFF' });

  for (const stage of ['active', 'starts-today', 'future']) {
    const boardRow = row(staff, { stage });

    for (const requiredStage of ['active', 'starts-today']) {
      assert.equal(
        findAttendanceTarget(
          [staff],
          [boardRow],
          branchId,
          staff.id,
          requiredStage,
        ),
        stage === requiredStage ? boardRow : null,
      );
    }
  }
});

test('a newly excluded pending staff account cannot be edited through a stale board row', () => {
  const staff = member({ role: 'STAFF' });
  const boardRow = row(staff);
  const filteredRoster = selectAttendanceRoster(
    [staff],
    branchId,
    new Set([staff.id]),
  );

  assert.equal(
    findAttendanceTarget(
      filteredRoster,
      [boardRow],
      branchId,
      staff.id,
      'active',
    ),
    null,
  );
});
