import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import { isDeepStrictEqual } from "node:util";

import { ACCESS_ROLES } from "../src/constants/accessPlans.js";
import {
  createTelegramAlertLink,
  deleteTelegramAlertSettings,
  getTelegramAlertSettings,
  updateTelegramAlertSettings,
} from "../src/controllers/userController.js";
import TelegramLinkToken from "../src/models/TelegramLinkToken.js";
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

const createEligibleUser = (overrides = {}) => ({
  _id: "507f1f77bcf86cd799439011",
  role: "user",
  accessRole: ACCESS_ROLES.SEMESTER,
  premium: {
    status: "active",
    expiresAt: new Date("2099-01-01T00:00:00.000Z"),
    whatsappAlertsEnabled: true,
    telegramAlertsEnabled: false,
  },
  telegram: {
    chatId: null,
    username: null,
    linkedAt: null,
    optedOutAt: null,
  },
  profile: { telegramAlertFilters: {} },
  async save() { return this; },
  ...overrides,
});

test("Telegram link tokens enforce one unconsumed token per user in MongoDB", () => {
  const activeTokenIndex = TelegramLinkToken.schema.indexes().find(([key]) => (
    isDeepStrictEqual(key, { user: 1 })
  ));

  assert.ok(activeTokenIndex);
  assert.equal(activeTokenIndex[1].unique, true);
  assert.deepEqual(activeTokenIndex[1].partialFilterExpression, {
    consumedAt: null,
  });
});

test("createTelegramAlertLink invalidates old links and returns only a new deep link", async () => {
  const originalUsername = process.env.TELEGRAM_BOT_USERNAME;
  const originalFindById = User.findById;
  const originalUpdateMany = TelegramLinkToken.updateMany;
  const originalCreate = TelegramLinkToken.create;
  const events = [];
  let persistedToken;

  process.env.TELEGRAM_BOT_USERNAME = "jobverify_test_bot";
  User.findById = async () => createEligibleUser();
  TelegramLinkToken.updateMany = async (filter, update) => {
    events.push({ type: "invalidate", filter, update });
  };
  TelegramLinkToken.create = async (payload) => {
    events.push({ type: "create" });
    persistedToken = payload;
    return payload;
  };

  try {
    const res = createResponseDouble();
    await createTelegramAlertLink({ user: { _id: "507f1f77bcf86cd799439011" } }, res);

    assert.equal(res.statusCode, 200);
    assert.deepEqual(Object.keys(res.body), ["data"]);
    assert.deepEqual(Object.keys(res.body.data), ["deepLink"]);
    assert.match(
      res.body.data.deepLink,
      /^https:\/\/t\.me\/jobverify_test_bot\?start=[A-Za-z0-9_-]+$/u,
    );
    assert.deepEqual(events.map(({ type }) => type), ["invalidate", "create"]);
    assert.deepEqual(events[0].filter, {
      user: "507f1f77bcf86cd799439011",
      consumedAt: null,
    });
    const rawToken = new URL(res.body.data.deepLink).searchParams.get("start");
    assert.equal(
      persistedToken.tokenHash,
      createHash("sha256").update(rawToken).digest("hex"),
    );
    assert.equal(JSON.stringify(persistedToken).includes(rawToken), false);
    assert.ok(
      persistedToken.expiresAt.getTime() - Date.now() > 9 * 60 * 1000,
      "link remains valid for approximately ten minutes",
    );
  } finally {
    process.env.TELEGRAM_BOT_USERNAME = originalUsername;
    User.findById = originalFindById;
    TelegramLinkToken.updateMany = originalUpdateMany;
    TelegramLinkToken.create = originalCreate;
  }
});

test("createTelegramAlertLink rejects users without an active eligible plan", async () => {
  const originalFindById = User.findById;
  const originalCreate = TelegramLinkToken.create;
  let tokenCreated = false;

  User.findById = async () => createEligibleUser({
    accessRole: ACCESS_ROLES.MONTHLY,
  });
  TelegramLinkToken.create = async () => {
    tokenCreated = true;
  };

  try {
    const res = createResponseDouble();
    await createTelegramAlertLink({ user: { _id: "507f1f77bcf86cd799439011" } }, res);

    assert.equal(res.statusCode, 403);
    assert.equal(tokenCreated, false);
  } finally {
    User.findById = originalFindById;
    TelegramLinkToken.create = originalCreate;
  }
});

test("a persistence collision is retried and leaves one active link token", async () => {
  const originalUsername = process.env.TELEGRAM_BOT_USERNAME;
  const originalFindById = User.findById;
  const originalUpdateMany = TelegramLinkToken.updateMany;
  const originalCreate = TelegramLinkToken.create;
  let activeToken = null;
  let collisionCount = 0;

  process.env.TELEGRAM_BOT_USERNAME = "jobverify_test_bot";
  User.findById = async () => createEligibleUser();
  TelegramLinkToken.updateMany = async () => {
    activeToken = null;
  };
  TelegramLinkToken.create = async (payload) => {
    await new Promise((resolve) => setImmediate(resolve));
    if (activeToken) {
      collisionCount += 1;
      throw Object.assign(new Error("duplicate active Telegram link"), {
        code: 11000,
      });
    }
    activeToken = payload;
    return payload;
  };

  try {
    const responses = [createResponseDouble(), createResponseDouble()];
    await Promise.all(responses.map((res) => createTelegramAlertLink({
      user: { _id: "507f1f77bcf86cd799439011" },
    }, res)));

    assert.deepEqual(responses.map(({ statusCode }) => statusCode), [200, 200]);
    assert.notEqual(
      responses[0].body.data.deepLink,
      responses[1].body.data.deepLink,
    );
    assert.equal(collisionCount, 1);
    const returnedHashes = responses.map(({ body }) => {
      const rawToken = new URL(body.data.deepLink).searchParams.get("start");
      return createHash("sha256").update(rawToken).digest("hex");
    });
    assert.ok(activeToken);
    assert.equal(returnedHashes.includes(activeToken.tokenHash), true);
  } finally {
    process.env.TELEGRAM_BOT_USERNAME = originalUsername;
    User.findById = originalFindById;
    TelegramLinkToken.updateMany = originalUpdateMany;
    TelegramLinkToken.create = originalCreate;
  }
});

test("updateTelegramAlertSettings requires both a link and eligible access when enabling", async () => {
  const originalFindById = User.findById;
  const users = [
    createEligibleUser(),
    createEligibleUser({
      accessRole: ACCESS_ROLES.MONTHLY,
      telegram: {
        chatId: "1001",
        username: "linked_user",
        linkedAt: new Date("2026-08-16T10:00:00.000Z"),
        optedOutAt: null,
      },
    }),
  ];
  User.findById = async () => users.shift();

  try {
    const unlinkedResponse = createResponseDouble();
    await updateTelegramAlertSettings({
      user: { _id: "507f1f77bcf86cd799439011" },
      body: { enabled: true },
    }, unlinkedResponse);
    assert.equal(unlinkedResponse.statusCode, 400);

    const ineligibleResponse = createResponseDouble();
    await updateTelegramAlertSettings({
      user: { _id: "507f1f77bcf86cd799439011" },
      body: { enabled: true },
    }, ineligibleResponse);
    assert.equal(ineligibleResponse.statusCode, 403);
  } finally {
    User.findById = originalFindById;
  }
});

test("Telegram settings expose safe linked state and update dedicated filters", async () => {
  const originalFindById = User.findById;
  const user = createEligibleUser({
    telegram: {
      chatId: "sensitive-chat-id",
      username: "job_seeker",
      linkedAt: new Date("2026-08-16T10:00:00.000Z"),
      optedOutAt: null,
    },
  });
  User.findById = async () => user;

  try {
    const updateResponse = createResponseDouble();
    await updateTelegramAlertSettings({
      user: { _id: user._id },
      body: {
        enabled: true,
        telegramAlertFilters: {
          jobType: ["Internship"],
          location: ["Bengaluru"],
          sortBy: "latest",
        },
      },
    }, updateResponse);

    assert.equal(updateResponse.statusCode, 200);
    assert.equal(user.premium.telegramAlertsEnabled, true);
    assert.deepEqual(user.profile.telegramAlertFilters.location, ["Bengaluru"]);
    assert.equal(updateResponse.body.data.linked, true);
    assert.equal("chatId" in updateResponse.body.data, false);

    const getResponse = createResponseDouble();
    await getTelegramAlertSettings({ user: { _id: user._id } }, getResponse);
    assert.equal(getResponse.body.data.username, "job_seeker");
    assert.equal(JSON.stringify(getResponse.body).includes("sensitive-chat-id"), false);
  } finally {
    User.findById = originalFindById;
  }
});

test("deleteTelegramAlertSettings unlinks Telegram without changing WhatsApp alerts", async () => {
  const originalFindById = User.findById;
  const originalUpdateMany = TelegramLinkToken.updateMany;
  let revokedFilter = null;
  const user = createEligibleUser({
    telegram: {
      chatId: "1001",
      username: "job_seeker",
      linkedAt: new Date("2026-08-16T10:00:00.000Z"),
      optedOutAt: null,
    },
    premium: {
      status: "active",
      expiresAt: new Date("2099-01-01T00:00:00.000Z"),
      whatsappAlertsEnabled: true,
      telegramAlertsEnabled: true,
    },
  });
  User.findById = async () => user;
  TelegramLinkToken.updateMany = async (filter) => {
    revokedFilter = filter;
  };

  try {
    const res = createResponseDouble();
    await deleteTelegramAlertSettings({ user: { _id: user._id } }, res);

    assert.equal(res.statusCode, 200);
    assert.equal(user.telegram.chatId, null);
    assert.equal(user.telegram.username, null);
    assert.equal(user.telegram.linkedAt, null);
    assert.ok(user.telegram.optedOutAt instanceof Date);
    assert.equal(user.premium.telegramAlertsEnabled, false);
    assert.equal(user.premium.whatsappAlertsEnabled, true);
    assert.deepEqual(revokedFilter, { user: user._id, consumedAt: null });
  } finally {
    User.findById = originalFindById;
    TelegramLinkToken.updateMany = originalUpdateMany;
  }
});
