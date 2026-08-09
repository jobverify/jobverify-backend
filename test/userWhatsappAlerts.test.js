import assert from "node:assert/strict";
import test from "node:test";

import { ACCESS_ROLES } from "../src/constants/accessPlans.js";
import {
  getWhatsappAlertSettings,
  updateWhatsappAlertSettings,
} from "../src/controllers/userController.js";
import User from "../src/models/User.js";

const createResponseDouble = () => ({
  statusCode: 200,
  body: null,
  status(code) {
    this.statusCode = code;
    return this;
  },
  json(payload) {
    this.body = payload;
    return this;
  },
});

test("updateWhatsappAlertSettings stores dedicated whatsappAlertFilters and returns them in the payload", async () => {
  const originalFindById = User.findById;
  const fakeUser = {
    _id: "user-1",
    role: "user",
    accessRole: ACCESS_ROLES.SEMESTER,
    premium: { status: "active", whatsappAlertsEnabled: false },
    contact: { phoneE164: null, whatsappOptInAt: null, whatsappOptOutAt: null },
    profile: { whatsappAlertFilters: {} },
    async save() { return this; },
  };
  User.findById = async () => fakeUser;

  try {
    const req = {
      user: { _id: "user-1" },
      body: {
        phoneE164: "9876543210",
        enabled: true,
        whatsappAlertFilters: {
          jobType: ["Internship"],
          location: ["Bengaluru"],
          sortBy: "latest",
        },
      },
    };
    const res = createResponseDouble();

    await updateWhatsappAlertSettings(req, res);

    assert.equal(res.statusCode, 200);
    assert.equal(fakeUser.contact.phoneE164, "+919876543210");
    assert.deepEqual(fakeUser.profile.whatsappAlertFilters.jobType, ["Internship"]);
    assert.deepEqual(res.body.data.whatsappAlertFilters.location, ["Bengaluru"]);
    assert.equal(res.body.data.whatsappAlertFilters.sortBy, "latest");
  } finally {
    User.findById = originalFindById;
  }
});

test("getWhatsappAlertSettings returns dedicated whatsappAlertFilters", async () => {
  const originalFindById = User.findById;
  const fakeUser = {
    _id: "user-1",
    role: "user",
    accessRole: ACCESS_ROLES.SEMESTER,
    premium: { status: "active", whatsappAlertsEnabled: true },
    contact: {
      phoneE164: "+919876543210",
      whatsappOptInAt: new Date("2026-07-28T00:00:00.000Z"),
      whatsappOptOutAt: null,
    },
    profile: {
      whatsappAlertFilters: {
        company: ["Example Corp"],
        jobType: ["Internship"],
        location: ["Bengaluru"],
        sortBy: "latest",
      },
    },
  };
  User.findById = async () => fakeUser;

  try {
    const res = createResponseDouble();
    await getWhatsappAlertSettings({ user: { _id: "user-1" } }, res);

    assert.equal(res.statusCode, 200);
    assert.deepEqual(res.body.data.whatsappAlertFilters.company, ["Example Corp"]);
    assert.deepEqual(res.body.data.whatsappAlertFilters.location, ["Bengaluru"]);
    assert.equal(res.body.data.whatsappAlertFilters.sortBy, "latest");
  } finally {
    User.findById = originalFindById;
  }
});

test("updateWhatsappAlertSettings enables alerts from a string boolean using the persisted phone", async () => {
  const originalFindById = User.findById;
  const fakeUser = {
    _id: "user-1",
    role: "user",
    accessRole: ACCESS_ROLES.SEMESTER,
    premium: { status: "active", whatsappAlertsEnabled: false },
    contact: {
      phoneE164: "+919876543210",
      whatsappOptInAt: null,
      whatsappOptOutAt: null,
    },
    profile: { whatsappAlertFilters: {} },
    async save() { return this; },
  };
  User.findById = async () => fakeUser;

  try {
    const res = createResponseDouble();
    await updateWhatsappAlertSettings({
      user: { _id: "user-1" },
      body: { enabled: "true" },
    }, res);

    assert.equal(res.statusCode, 200);
    assert.equal(fakeUser.premium.whatsappAlertsEnabled, true);
    assert.ok(fakeUser.contact.whatsappOptInAt instanceof Date);
  } finally {
    User.findById = originalFindById;
  }
});

test("updateWhatsappAlertSettings rejects enabling alerts with an invalid persisted phone", async () => {
  const originalFindById = User.findById;
  const fakeUser = {
    _id: "user-1",
    role: "user",
    accessRole: ACCESS_ROLES.SEMESTER,
    premium: { status: "active", whatsappAlertsEnabled: false },
    contact: {
      phoneE164: "not-a-phone",
      whatsappOptInAt: null,
      whatsappOptOutAt: null,
    },
    profile: { whatsappAlertFilters: {} },
    async save() { return this; },
  };
  User.findById = async () => fakeUser;

  try {
    const res = createResponseDouble();
    await updateWhatsappAlertSettings({
      user: { _id: "user-1" },
      body: { enabled: true },
    }, res);

    assert.equal(res.statusCode, 400);
    assert.equal(res.body?.message, "A valid WhatsApp phone number is required.");
    assert.equal(fakeUser.premium.whatsappAlertsEnabled, false);
    assert.equal(fakeUser.contact.whatsappOptInAt, null);
  } finally {
    User.findById = originalFindById;
  }
});
