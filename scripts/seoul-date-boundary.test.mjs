import assert from 'node:assert/strict';
import test from 'node:test';

import { toSeoulDateKey } from '../src/app/features/manager-beverages/model/seoul-date.ts';

test('UTC timestamp just after Seoul midnight belongs to the new Seoul date', () => {
  assert.equal(toSeoulDateKey('2026-09-09T15:00:01Z'), '2026-09-10');
});

test('UTC timestamp just before Seoul midnight stays on the prior Seoul date', () => {
  assert.equal(toSeoulDateKey('2026-09-09T14:59:59Z'), '2026-09-09');
});
