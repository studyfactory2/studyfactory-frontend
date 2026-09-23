import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildSignupRequest,
  buildVerificationRequest,
} from '../src/app/features/auth/registration-flow.ts';
import { formatRegistrationCodeExpiry } from '../src/app/screens/admin/members/model/registration-code.ts';

const member = {
  memberId: 42,
  branchId: 1,
  name: '테스트 사원',
  seatNumber: null,
  expectedJoinDate: null,
  certificationId: null,
  drinkSetting: null,
  drinkNotes: null,
};

test('student verification omits a code even when an old privileged draft exists', () => {
  const request = buildVerificationRequest(
    'member',
    '  테스트 사원  ',
    '1',
    '00123456',
  );
  assert.deepEqual(request, { branchId: 1, name: '테스트 사원' });
  assert.equal(Object.hasOwn(request, 'registrationCode'), false);
});

test('student signup retains its existing request shape', () => {
  assert.deepEqual(buildSignupRequest({ member }, '0123', '0123'), {
    memberId: 42,
    password: '0123',
  });
});

test('staff/admin verification and signup preserve leading-zero codes', () => {
  const verifiedRequest = buildVerificationRequest(
    'privileged',
    member.name,
    '1',
    '00123456',
  );
  assert.equal(verifiedRequest.registrationCode, '00123456');
  const signupRequest = buildSignupRequest(
    { member, registrationCode: verifiedRequest.registrationCode },
    '0123',
    '0123',
  );
  assert.deepEqual(signupRequest, {
    memberId: 42,
    password: '0123',
    registrationCode: '00123456',
  });
});

test('missing or malformed privileged codes are rejected before spending an attempt', () => {
  for (const code of [
    '',
    '1234567',
    '123456789',
    '12ab5678',
    '１２３４５６７８',
  ]) {
    assert.throws(() =>
      buildVerificationRequest('privileged', member.name, '1', code),
    );
  }
});

test('invalid identities cannot produce verification requests', () => {
  for (const branchId of ['', '0', '-1', '1.5', 'wrong']) {
    assert.throws(() =>
      buildVerificationRequest('member', member.name, branchId, ''),
    );
  }
  assert.throws(() => buildVerificationRequest('member', '   ', '1', ''));
});

test('PIN validation and confirmation run before final signup', () => {
  for (const password of ['', '123', '12345', 'abcd']) {
    assert.throws(() => buildSignupRequest({ member }, password, password));
  }
  assert.throws(() => buildSignupRequest({ member }, '1234', '4321'));
  assert.throws(() =>
    buildSignupRequest({ member, registrationCode: '' }, '1234', '1234'),
  );
});

test('bare backend UTC expiry matches explicit UTC and crosses the Seoul date boundary', () => {
  const result = formatRegistrationCodeExpiry('2026-09-23T15:30:00');
  assert.equal(result, formatRegistrationCodeExpiry('2026-09-23T15:30:00Z'));
  assert.equal(
    result,
    formatRegistrationCodeExpiry('2026-09-24T00:30:00+09:00'),
  );
  assert.match(result, /24일/);
  assert.match(result, /한국 시간/);
});

test('missing or invalid expiry is never displayed as a valid deadline', () => {
  assert.equal(formatRegistrationCodeExpiry(null), null);
  assert.equal(formatRegistrationCodeExpiry('not-a-date'), null);
});
