import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import {
  getManagerMobileNavigation,
  getManagerMobilePage,
  getManagerMobileSection,
} from '../../src/app/shared/layout/AppShell/manager-mobile-navigation.ts';
import { adminRoutes, staffRoutes } from '../../src/app/core/router/routes.ts';

test('member and unauthenticated sessions have no manager navigation', () => {
  assert.equal(getManagerMobileNavigation('MEMBER'), null);
  assert.equal(getManagerMobileNavigation(null), null);
});

test('admin destinations stay inside ADMIN routes, including personal requests', () => {
  const nav = getManagerMobileNavigation('ADMIN');
  assert.equal(nav.attendance, '/admin/attendance');
  assert.equal(nav.adminHub, '/admin/management');
  assert.equal(nav.staffHub, '/admin/staff');
  assert.deepEqual(
    nav.admin.slice(0, 3).map((item) => item.label),
    ['사원 현황', '휴무 관리', '출입 QR'],
  );
  assert.deepEqual(
    nav.staff.map((item) => item.label),
    ['음료 운영', '개인 휴무신청', '반찬 신청'],
  );
  for (const item of [...nav.admin, ...nav.staff])
    assert.ok(item.to.startsWith('/admin'));
});

test('staff destinations never expose admin menus or routes', () => {
  const nav = getManagerMobileNavigation('STAFF');
  assert.equal(nav.attendance, '/staff/attendance');
  assert.equal(nav.adminHub, null);
  assert.equal(nav.staffHub, '/staff/workspace');
  assert.deepEqual(nav.admin, []);
  for (const item of nav.staff) assert.ok(item.to.startsWith('/staff'));
  assert.ok(
    nav.staff.some((item) => item.to === '/staff/operations?section=leave'),
  );
  assert.ok(
    nav.staff.some((item) => item.to === '/staff/operations?section=meals'),
  );
});

test('legacy tools remain reachable through operations and home links', () => {
  for (const [role, prefix] of [
    ['ADMIN', '/admin'],
    ['STAFF', '/staff'],
  ]) {
    const nav = getManagerMobileNavigation(role);
    const links = [...nav.admin, ...nav.staff];
    assert.ok(links.some((item) => item.to === prefix));
    assert.ok(links.some((item) => item.to === `${prefix}/operations`));
  }
});

test('active grouping distinguishes admin management from staff functions', () => {
  assert.equal(
    getManagerMobileSection('ADMIN', '/admin/attendance'),
    'attendance',
  );
  assert.equal(getManagerMobileSection('ADMIN', '/admin/members'), 'admin');
  assert.equal(
    getManagerMobileSection('ADMIN', adminRoutes.management),
    'admin',
  );
  assert.equal(
    getManagerMobileSection('ADMIN', adminRoutes.staffWorkspace),
    'staff',
  );
  assert.equal(getManagerMobileSection('ADMIN', '/admin/operations'), 'admin');
  for (const item of getManagerMobileNavigation('ADMIN').staff) {
    assert.equal(getManagerMobileSection('ADMIN', item.to), 'staff');
  }
  assert.equal(
    getManagerMobileSection('STAFF', '/staff/attendance'),
    'attendance',
  );
  assert.equal(getManagerMobileSection('STAFF', '/staff/operations'), 'staff');
  assert.equal(
    getManagerMobileSection('STAFF', staffRoutes.workspace),
    'staff',
  );
});

test('hub pages and attendance have explicit titles and no parent page', () => {
  for (const [role, path, title] of [
    ['ADMIN', adminRoutes.management, '관리자'],
    ['ADMIN', adminRoutes.staffWorkspace, '스태프'],
    ['STAFF', staffRoutes.workspace, '스태프'],
    ['ADMIN', adminRoutes.attendance, '출석'],
    ['STAFF', staffRoutes.attendance, '출석'],
  ]) {
    assert.deepEqual(getManagerMobilePage(role, path), {
      title,
      parent: null,
      personal: false,
    });
  }
});

test('admin management destinations return to the management hub', () => {
  for (const [path, search] of [
    [adminRoutes.members, ''],
    [adminRoutes.operations, ''],
    [adminRoutes.operations, '?section=leaves'],
    [adminRoutes.operations, '?section=qr'],
  ]) {
    const page = getManagerMobilePage('ADMIN', path, search);
    assert.equal(page.parent, adminRoutes.management);
    assert.equal(page.personal, false);
    assert.ok(page.title.trim().length > 0);
  }
});

test('admin staff functions retain admin-local parents and personal identity flags', () => {
  for (const [path, personal] of [
    [adminRoutes.operationsBeverages, false],
    [adminRoutes.ownLeaves, true],
    [adminRoutes.ownSideDishes, true],
  ]) {
    const page = getManagerMobilePage('ADMIN', path);
    assert.equal(page.parent, adminRoutes.staffWorkspace);
    assert.equal(page.personal, personal);
    assert.ok(page.title.trim().length > 0);
  }
});

test('staff beverage and operational destinations return to the staff hub', () => {
  for (const [path, search, personal] of [
    [staffRoutes.beverages, '', false],
    [staffRoutes.operations, '', false],
    [staffRoutes.operations, '?section=work', false],
    [staffRoutes.operations, '?section=leave', true],
    [staffRoutes.operations, '?section=meals', true],
    [staffRoutes.operations, '?section=member-leave', false],
    [staffRoutes.operations, '?section=schedule', false],
    [staffRoutes.operations, '?section=seats', false],
    [staffRoutes.operations, '?section=unsupported', false],
  ]) {
    const page = getManagerMobilePage('STAFF', path, search);
    assert.equal(page.parent, staffRoutes.workspace);
    assert.equal(page.personal, personal);
    assert.ok(page.title.trim().length > 0);
  }
});

test('direct member leave links never appear as personal staff requests', () => {
  for (const section of ['leave', 'meals']) {
    const search = new URLSearchParams({
      section,
      view: 'member-leave',
      memberId: '12',
      date: '2026-10-22',
      slot: '3',
    });
    const page = getManagerMobilePage(
      'STAFF',
      staffRoutes.operations,
      `?${search}`,
    );
    assert.equal(page.parent, staffRoutes.workspace);
    assert.equal(page.personal, false);
  }
});

test('invalid direct leave targets retain the ordinary requested staff section', () => {
  const page = getManagerMobilePage(
    'STAFF',
    staffRoutes.operations,
    '?section=leave&view=member-leave&memberId=12&date=2026-02-30&slot=3',
  );
  assert.equal(page.parent, staffRoutes.workspace);
  assert.equal(page.personal, true);
});

test('hub routes remain inside their existing role-only route groups', () => {
  const source = readFileSync(
    new URL('../../src/app/core/router/AppRouter.tsx', import.meta.url),
    'utf8',
  );
  const admin = guardedRouteBlock(source, 'ADMIN');
  const staff = guardedRouteBlock(source, 'STAFF');
  const member = guardedRouteBlock(source, 'MEMBER');
  assert.match(admin, /path="management"/);
  assert.match(admin, /path="staff"/);
  assert.match(staff, /path="workspace"/);
  assert.doesNotMatch(staff, /path="(?:management|staff)"/);
  assert.doesNotMatch(member, /path="(?:management|staff|workspace)"/);
});

test('mobile top navigation uses routed links without the old dialog menu', () => {
  const source = readFileSync(
    new URL(
      '../../src/app/shared/layout/AppShell/ManagerMobileNavigation.tsx',
      import.meta.url,
    ),
    'utf8',
  );
  assert.match(source, /<(?:NavLink|Link)\b/);
  assert.doesNotMatch(
    source,
    /useManagerMobileMenu|<Modal\b|aria-haspopup="dialog"/,
  );
});

function guardedRouteBlock(source, role) {
  const marker = `<Route element={<ProtectedRoute allowedRoles={['${role}']} />}>`;
  const start = source.indexOf(marker);
  assert.notEqual(start, -1, `${role} must retain its role-only route guard`);
  const next = source.indexOf('<Route element={<ProtectedRoute', start + 1);
  return source.slice(start, next === -1 ? source.length : next);
}
