import assert from "node:assert/strict";
import test from "node:test";
import bcrypt from "bcryptjs";
import { login } from "../src/controllers/authController.js";
import User from "../src/models/User.js";
import PendingUser from "../src/models/PendingUser.js";

const createResponse = () => ({
  statusCode: 200,
  body: null,
  status(value) { this.statusCode = value; return this; },
  json(value) { this.body = value; return this; },
  cookie() { assert.fail("An unsuccessful sign-in must not create a session."); },
});

test("an incorrect password does not disclose whether an email uses Google sign-in", async (t) => {
  const passwordHash = await bcrypt.hash("CorrectPassword123", 4);
  const accounts = new Map([
    ["google.account@gmail.com", { password: null, google: { sub: "google-subject" } }],
    ["password.account@gmail.com", { password: passwordHash }],
  ]);
  t.mock.method(User, "findOne", async ({ email }) => accounts.get(email) ?? null);
  t.mock.method(PendingUser, "findOne", async () => null);

  for (const email of ["unknown.account@gmail.com", ...accounts.keys()]) {
    const res = createResponse();
    await login({ body: { email, password: "IncorrectPassword123" } }, res);

    assert.equal(res.statusCode, 401, email);
    assert.deepEqual(res.body, {
      code: 401,
      success: false,
      message: "Invalid credentials",
    }, email);
  }
});

test('failed login categories each perform one policy-cost password comparison', async t => {
  const accounts = new Map([
    ['google.account@gmail.com', { password: null, google: { sub: 'fixture-subject' } }],
    ['password.account@gmail.com', { password: await bcrypt.hash('FixturePassword123!', 10) }],
  ]);
  t.mock.method(User, 'findOne', async ({ email }) => accounts.get(email) ?? null);
  t.mock.method(PendingUser, 'findOne', async () => null);
  const compare = t.mock.method(bcrypt, 'compare', async (_password, hash) => {
    assert.equal(bcrypt.getRounds(hash), 10);
    return false;
  });
  for (const email of ['unknown.account@gmail.com', ...accounts.keys()]) {
    const previous = compare.mock.callCount();
    const res = createResponse();
    await login({ body: { email, password: 'IncorrectPassword123!' } }, res);
    assert.equal(compare.mock.callCount() - previous, 1, email);
    assert.equal(res.statusCode, 401);
    assert.equal(res.body.message, 'Invalid credentials');
  }
});
