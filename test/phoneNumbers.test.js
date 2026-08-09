import assert from "node:assert/strict";
import test from "node:test";
import { normalizePhoneE164 } from "../src/utils/phoneNumbers.js";

test("normalizePhoneE164 accepts local Indian and E.164 values", () => {
  assert.equal(normalizePhoneE164("9876543210"), "+919876543210");
  assert.equal(normalizePhoneE164("+14155552671"), "+14155552671");
  assert.equal(normalizePhoneE164("not-a-phone"), null);
});
