import assert from 'node:assert/strict';
import test from 'node:test';
import {
  adminRoutes,
  appRoutes,
  getRoleHomePath,
  memberRoutes,
  staffRoutes,
} from '../../src/app/core/router/routes.ts';
import {
  readAdminOperationsSection,
  readStaffOperationsSection,
  withAdminOperationsOverview,
  withStaffOperationsSection,
} from '../../src/app/features/manager-operations/model/manager-operation-sections.ts';

test('manager default landing is attendance while member landing is unchanged', () => {
  assert.equal(getRoleHomePath('ADMIN'), adminRoutes.attendance);
  assert.equal(getRoleHomePath('STAFF'), staffRoutes.attendance);
  assert.equal(getRoleHomePath('MEMBER'), memberRoutes.home);
});

test('legacy home and operational paths remain stable', () => {
  assert.equal(adminRoutes.home, appRoutes.admin);
  assert.equal(staffRoutes.home, appRoutes.staff);
  assert.equal(adminRoutes.operations, '/admin/operations');
  assert.equal(adminRoutes.operationsBeverages, '/admin/operations/beverages');
  assert.equal(staffRoutes.operations, '/staff/operations');
  assert.equal(staffRoutes.beverages, '/staff/beverages');
});

test('admin personal request destinations stay inside the admin workspace', () => {
  assert.equal(adminRoutes.ownLeaves, '/admin/operations/my-leave');
  assert.equal(adminRoutes.ownSideDishes, '/admin/operations/my-side-dishes');
});

for (const section of [
  'work',
  'leave',
  'member-leave',
  'meals',
  'schedule',
  'seats',
]) {
  test(`staff section link opens ${section}`, () => {
    assert.equal(
      readStaffOperationsSection(new URLSearchParams({ section })),
      section,
    );
  });
}

test('missing or unsupported staff sections keep the existing work default', () => {
  for (const value of ['', 'section=qr', 'section=LEAVE', 'view=leave']) {
    assert.equal(
      readStaffOperationsSection(new URLSearchParams(value)),
      'work',
    );
  }
});

test('valid direct member leave links win over a general staff or admin section', () => {
  const params = new URLSearchParams({
    section: 'qr',
    view: 'member-leave',
    memberId: '12',
    date: '2026-10-22',
    slot: '3',
    branchId: '2',
  });
  assert.equal(readStaffOperationsSection(params), 'member-leave');
  assert.equal(readAdminOperationsSection(params), 'leaves');
});

for (const section of ['leave', 'meals']) {
  test(`member-targeted links retain priority over the focused ${section} page`, () => {
    const params = new URLSearchParams({
      section,
      view: 'member-leave',
      memberId: '12',
      date: '2026-10-23',
      slot: '3',
      branchId: '2',
    });
    const original = params.toString();

    assert.equal(readStaffOperationsSection(params), 'member-leave');
    assert.equal(params.toString(), original);
  });

  test(`leaving member management for focused ${section} preserves unrelated query values`, () => {
    const params = new URLSearchParams(
      'view=member-leave&branchId=2&memberId=12&date=2026-10-23&slot=3&section=member-leave&panel=tasks',
    );
    const original = params.toString();
    const next = withStaffOperationsSection(params, section);

    assert.equal(params.toString(), original);
    assert.equal(next.toString(), `section=${section}&panel=tasks`);
    assert.equal(readStaffOperationsSection(next), section);
  });
}

test('invalid direct leave targets do not override a requested section', () => {
  const params = new URLSearchParams({
    section: 'meals',
    view: 'member-leave',
    memberId: '12',
    date: '2026-02-30',
    slot: '3',
  });
  assert.equal(readStaffOperationsSection(params), 'meals');
  params.set('section', 'qr');
  assert.equal(readAdminOperationsSection(params), 'qr');
});

test('changing staff tabs clears direct leave targeting and preserves other query values', () => {
  const params = new URLSearchParams(
    'view=member-leave&branchId=2&memberId=12&date=2026-10-22&slot=3&section=work&panel=tasks&tag=one&tag=two',
  );
  const original = params.toString();
  const next = withStaffOperationsSection(params, 'leave');
  assert.equal(params.toString(), original);
  assert.equal(next.get('section'), 'leave');
  for (const key of ['view', 'branchId', 'memberId', 'date', 'slot']) {
    assert.equal(next.has(key), false);
  }
  assert.equal(next.get('panel'), 'tasks');
  assert.deepEqual(next.getAll('tag'), ['one', 'two']);
});

test('staff tab changes round trip through every supported section', () => {
  for (const section of [
    'work',
    'leave',
    'member-leave',
    'meals',
    'schedule',
    'seats',
  ]) {
    const params = withStaffOperationsSection(new URLSearchParams(), section);
    assert.equal(readStaffOperationsSection(params), section);
  }
});

test('admin dedicated section links preserve the default combined overview', () => {
  assert.equal(readAdminOperationsSection(new URLSearchParams()), 'overview');
  assert.equal(
    readAdminOperationsSection(new URLSearchParams('section=work')),
    'overview',
  );
  assert.equal(
    readAdminOperationsSection(new URLSearchParams('section=leaves')),
    'leaves',
  );
  assert.equal(
    readAdminOperationsSection(new URLSearchParams('section=qr')),
    'qr',
  );
});

test('admin direct leave exit returns to the full operations overview', () => {
  const params = new URLSearchParams(
    'view=member-leave&branchId=2&memberId=12&date=2026-10-22&slot=3&section=qr&panel=tasks',
  );
  const original = params.toString();
  const next = withAdminOperationsOverview(params);
  assert.equal(params.toString(), original);
  assert.equal(next.toString(), 'panel=tasks');
  assert.equal(readAdminOperationsSection(next), 'overview');
});
