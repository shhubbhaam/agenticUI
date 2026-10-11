const { test } = require('node:test');
const assert = require('node:assert/strict');
const { parseDevUsers, withDevLogin } = require('../src/devLogin');

const users = parseDevUsers('Asha@test.local:101, ravi@test.local:202, bad@x:../1');
const lh = withDevLogin({ getTrail() {} }, { users, password: 'Devpass@123', env: 'development' });

test('dev login: mapped email + password -> server-side learner id', async () => {
  assert.deepEqual(await lh.login('asha@test.local', 'Devpass@123'), { learnerId: '101', displayName: 'asha' });
});
test('dev login: wrong password / unknown email -> null', async () => {
  assert.equal(await lh.login('asha@test.local', 'nope'), null);
  assert.equal(await lh.login('who@test.local', 'Devpass@123'), null);
});
test('dev login: malformed id in config is ignored', () => assert.equal(users.has('bad@x'), false));
test('dev login: refuses production', () =>
  assert.throws(() => withDevLogin({}, { users, password: 'Devpass@123', env: 'production' })));
test('dev login: other adapter methods untouched', () => assert.equal(typeof lh.getTrail, 'function'));
