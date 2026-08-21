import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import { isDeepStrictEqual } from "node:util";
import express from "express";

import { processTelegramWebhook } from "../src/controllers/telegramController.js";
import TelegramLinkToken from "../src/models/TelegramLinkToken.js";
import User from "../src/models/User.js";
import telegramRoutes from "../src/routes/telegramRoutes.js";
import { getApiRateLimitProfile } from "../src/utils/rateLimit.js";

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
  send(payload) {
    this.body = payload;
    return this;
  },
});

const createRequest = ({ secret = "webhook-secret", body }) => ({
  body,
  get(name) {
    return name.toLowerCase() === "x-telegram-bot-api-secret-token"
      ? secret
      : undefined;
  },
});

const withTelegramWebhookServer = async (callback) => {
  const app = express();
  app.use("/api/integrations/telegram", telegramRoutes);
  app.use((error, _req, res, _next) => {
    res.status(error.status || 500).json({ message: error.message });
  });

  const server = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));

  try {
    const { port } = server.address();
    await callback(`http://127.0.0.1:${port}/api/integrations/telegram/webhook`);
  } finally {
    await new Promise((resolve, reject) => server.close((error) => (
      error ? reject(error) : resolve()
    )));
  }
};

test("Telegram webhook is excluded from global API limiter profiles", () => {
  assert.equal(
    getApiRateLimitProfile({
      method: "POST",
      originalUrl: "/api/integrations/telegram/webhook",
    }),
    "skip",
  );
});

test("Telegram chat IDs have a unique partial ownership index", () => {
  const chatIndex = User.schema.indexes().find(([key]) => (
    isDeepStrictEqual(key, { "telegram.chatId": 1 })
  ));

  assert.ok(chatIndex);
  assert.equal(chatIndex[1].unique, true);
  assert.deepEqual(chatIndex[1].partialFilterExpression, {
    "telegram.chatId": { $type: "string" },
  });
});

test("Telegram webhook authenticates before parsing JSON request bodies", async () => {
  const originalSecret = process.env.TELEGRAM_WEBHOOK_SECRET;
  process.env.TELEGRAM_WEBHOOK_SECRET = "expected-secret";

  try {
    await withTelegramWebhookServer(async (url) => {
      const invalidSecretResponse = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Telegram-Bot-Api-Secret-Token": "wrong-secret",
        },
        body: "{malformed-json",
      });
      assert.equal(invalidSecretResponse.status, 401);

      const validSecretResponse = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Telegram-Bot-Api-Secret-Token": "expected-secret",
        },
        body: "{malformed-json",
      });
      assert.equal(validSecretResponse.status, 400);
    });
  } finally {
    process.env.TELEGRAM_WEBHOOK_SECRET = originalSecret;
  }
});

test("Telegram webhook rejects a bad secret before consuming a link token", async () => {
  const originalSecret = process.env.TELEGRAM_WEBHOOK_SECRET;
  const originalFindOneAndUpdate = TelegramLinkToken.findOneAndUpdate;
  let consumeAttempted = false;
  process.env.TELEGRAM_WEBHOOK_SECRET = "expected-secret";
  TelegramLinkToken.findOneAndUpdate = async () => {
    consumeAttempted = true;
  };

  try {
    const res = createResponseDouble();
    await processTelegramWebhook(createRequest({
      secret: "wrong-secret",
      body: {
        message: {
          text: "/start raw-token",
          chat: { id: 1001, type: "private" },
        },
      },
    }), res);

    assert.equal(res.statusCode, 401);
    assert.equal(consumeAttempted, false);
  } finally {
    process.env.TELEGRAM_WEBHOOK_SECRET = originalSecret;
    TelegramLinkToken.findOneAndUpdate = originalFindOneAndUpdate;
  }
});

test("a private /start binds one account once and sends confirmation", async () => {
  const originalSecret = process.env.TELEGRAM_WEBHOOK_SECRET;
  const originalEnabled = process.env.TELEGRAM_ENABLED;
  const originalToken = process.env.TELEGRAM_BOT_TOKEN;
  const originalFindOneAndUpdate = TelegramLinkToken.findOneAndUpdate;
  const originalUserFindOneAndUpdate = User.findOneAndUpdate;
  const originalFetch = global.fetch;
  const rawToken = "single-use-token";
  const user = {
    _id: "507f1f77bcf86cd799439011",
    premium: { telegramAlertsEnabled: false },
    telegram: {},
  };
  let available = true;
  let bindingCount = 0;
  const sentBodies = [];

  process.env.TELEGRAM_WEBHOOK_SECRET = "webhook-secret";
  process.env.TELEGRAM_ENABLED = "true";
  process.env.TELEGRAM_BOT_TOKEN = "bot-token";
  TelegramLinkToken.findOneAndUpdate = async (filter) => {
    assert.equal(
      filter.tokenHash,
      createHash("sha256").update(rawToken).digest("hex"),
    );
    if (!available) return null;
    available = false;
    return { user: user._id };
  };
  User.findOneAndUpdate = async (filter, update) => {
    assert.deepEqual(filter, { _id: user._id });
    bindingCount += 1;
    user.telegram.chatId = update.$set["telegram.chatId"];
    user.telegram.username = update.$set["telegram.username"];
    user.telegram.linkedAt = update.$set["telegram.linkedAt"];
    user.telegram.optedOutAt = update.$set["telegram.optedOutAt"];
    return user;
  };
  global.fetch = async (_url, options) => {
    sentBodies.push(JSON.parse(options.body));
    return {
      ok: true,
      status: 200,
      json: async () => ({ ok: true, result: { message_id: 77 } }),
    };
  };

  const request = createRequest({
    body: {
      message: {
        text: `/start ${rawToken}`,
        chat: { id: 1001, type: "private", username: "telegram_user" },
      },
    },
  });

  try {
    const firstResponse = createResponseDouble();
    await processTelegramWebhook(request, firstResponse);
    assert.equal(firstResponse.statusCode, 200);
    assert.equal(user.telegram.chatId, "1001");
    assert.equal(user.telegram.username, "telegram_user");
    assert.ok(user.telegram.linkedAt instanceof Date);
    assert.equal(user.telegram.optedOutAt, null);
    assert.equal(bindingCount, 1);
    assert.equal(sentBodies.length, 1);
    assert.equal(sentBodies[0].chat_id, "1001");

    const replayResponse = createResponseDouble();
    await processTelegramWebhook(request, replayResponse);
    assert.equal(replayResponse.statusCode, 200);
    assert.equal(bindingCount, 1);
    assert.equal(sentBodies.length, 1);
  } finally {
    process.env.TELEGRAM_WEBHOOK_SECRET = originalSecret;
    process.env.TELEGRAM_ENABLED = originalEnabled;
    process.env.TELEGRAM_BOT_TOKEN = originalToken;
    TelegramLinkToken.findOneAndUpdate = originalFindOneAndUpdate;
    User.findOneAndUpdate = originalUserFindOneAndUpdate;
    global.fetch = originalFetch;
  }
});

test("concurrent /start commands cannot bind one private chat to two users", async () => {
  const originalSecret = process.env.TELEGRAM_WEBHOOK_SECRET;
  const originalEnabled = process.env.TELEGRAM_ENABLED;
  const originalToken = process.env.TELEGRAM_BOT_TOKEN;
  const originalTokenFindOneAndUpdate = TelegramLinkToken.findOneAndUpdate;
  const originalFindById = User.findById;
  const originalUserFindOneAndUpdate = User.findOneAndUpdate;
  const originalFetch = global.fetch;
  const users = new Map([
    ["507f1f77bcf86cd799439011", {
      _id: "507f1f77bcf86cd799439011",
      premium: { telegramAlertsEnabled: false },
      telegram: {},
      async save() { return this; },
    }],
    ["507f1f77bcf86cd799439012", {
      _id: "507f1f77bcf86cd799439012",
      premium: { telegramAlertsEnabled: false },
      telegram: {},
      async save() { return this; },
    }],
  ]);
  const tokenOwners = new Map([
    [createHash("sha256").update("token-one").digest("hex"), "507f1f77bcf86cd799439011"],
    [createHash("sha256").update("token-two").digest("hex"), "507f1f77bcf86cd799439012"],
  ]);
  let chatOwner = null;
  const sentBodies = [];

  process.env.TELEGRAM_WEBHOOK_SECRET = "webhook-secret";
  process.env.TELEGRAM_ENABLED = "true";
  process.env.TELEGRAM_BOT_TOKEN = "bot-token";
  TelegramLinkToken.findOneAndUpdate = async (filter) => {
    const user = tokenOwners.get(filter.tokenHash);
    tokenOwners.delete(filter.tokenHash);
    return user ? { user } : null;
  };
  User.findById = async (userId) => users.get(String(userId));
  User.findOneAndUpdate = async (filter, update) => {
    await new Promise((resolve) => setImmediate(resolve));
    const userId = String(filter._id);
    if (chatOwner && chatOwner !== userId) {
      throw Object.assign(new Error("duplicate Telegram chat"), { code: 11000 });
    }
    chatOwner = userId;
    const user = users.get(userId);
    user.telegram.chatId = update.$set["telegram.chatId"];
    user.telegram.username = update.$set["telegram.username"];
    user.telegram.linkedAt = update.$set["telegram.linkedAt"];
    user.telegram.optedOutAt = update.$set["telegram.optedOutAt"];
    return user;
  };
  global.fetch = async (_url, options) => {
    sentBodies.push(JSON.parse(options.body));
    return {
      ok: true,
      status: 200,
      json: async () => ({ ok: true, result: { message_id: sentBodies.length } }),
    };
  };

  const requestFor = (rawToken) => createRequest({
    body: {
      message: {
        text: `/start ${rawToken}`,
        chat: { id: 1001, type: "private", username: "shared_chat" },
      },
    },
  });

  try {
    const responses = [createResponseDouble(), createResponseDouble()];
    await Promise.all([
      processTelegramWebhook(requestFor("token-one"), responses[0]),
      processTelegramWebhook(requestFor("token-two"), responses[1]),
    ]);

    assert.deepEqual(responses.map(({ statusCode }) => statusCode), [200, 200]);
    assert.equal(
      [...users.values()].filter((user) => user.telegram.chatId === "1001").length,
      1,
    );
    assert.equal(
      sentBodies.filter(({ text }) => text === "Your JobVerify Telegram alerts are linked.").length,
      1,
    );
    assert.equal(
      sentBodies.filter(({ text }) => /already linked/u.test(text)).length,
      1,
    );
  } finally {
    process.env.TELEGRAM_WEBHOOK_SECRET = originalSecret;
    process.env.TELEGRAM_ENABLED = originalEnabled;
    process.env.TELEGRAM_BOT_TOKEN = originalToken;
    TelegramLinkToken.findOneAndUpdate = originalTokenFindOneAndUpdate;
    User.findById = originalFindById;
    User.findOneAndUpdate = originalUserFindOneAndUpdate;
    global.fetch = originalFetch;
  }
});

test("public chat commands return 200 without consuming a link", async () => {
  const originalSecret = process.env.TELEGRAM_WEBHOOK_SECRET;
  const originalFindOneAndUpdate = TelegramLinkToken.findOneAndUpdate;
  let consumeAttempted = false;
  process.env.TELEGRAM_WEBHOOK_SECRET = "webhook-secret";
  TelegramLinkToken.findOneAndUpdate = async () => {
    consumeAttempted = true;
  };

  try {
    const res = createResponseDouble();
    await processTelegramWebhook(createRequest({
      body: {
        message: {
          text: "/start valid-looking-token",
          chat: { id: -1001, type: "group" },
        },
      },
    }), res);

    assert.equal(res.statusCode, 200);
    assert.equal(consumeAttempted, false);
  } finally {
    process.env.TELEGRAM_WEBHOOK_SECRET = originalSecret;
    TelegramLinkToken.findOneAndUpdate = originalFindOneAndUpdate;
  }
});

test("private /stop unlinks Telegram without disabling WhatsApp alerts", async () => {
  const originalSecret = process.env.TELEGRAM_WEBHOOK_SECRET;
  const originalFindOneAndUpdate = User.findOneAndUpdate;
  const originalUpdateMany = TelegramLinkToken.updateMany;
  let revokedFilter = null;
  const user = {
    _id: "507f1f77bcf86cd799439011",
    premium: {
      telegramAlertsEnabled: true,
      whatsappAlertsEnabled: true,
    },
    telegram: {
      chatId: "1001",
      username: "telegram_user",
      linkedAt: new Date("2026-08-16T10:00:00.000Z"),
      optedOutAt: null,
    },
  };
  process.env.TELEGRAM_WEBHOOK_SECRET = "webhook-secret";
  User.findOneAndUpdate = async (filter, update) => {
    assert.deepEqual(filter, { "telegram.chatId": "1001" });
    user.telegram.chatId = update.$set["telegram.chatId"];
    user.telegram.username = update.$set["telegram.username"];
    user.telegram.linkedAt = update.$set["telegram.linkedAt"];
    user.telegram.optedOutAt = update.$set["telegram.optedOutAt"];
    user.premium.telegramAlertsEnabled = update.$set["premium.telegramAlertsEnabled"];
    return user;
  };
  TelegramLinkToken.updateMany = async (filter) => {
    revokedFilter = filter;
  };

  try {
    const res = createResponseDouble();
    await processTelegramWebhook(createRequest({
      body: {
        message: {
          text: "/stop",
          chat: { id: 1001, type: "private", username: "telegram_user" },
        },
      },
    }), res);

    assert.equal(res.statusCode, 200);
    assert.equal(user.telegram.chatId, null);
    assert.equal(user.telegram.username, null);
    assert.equal(user.telegram.linkedAt, null);
    assert.ok(user.telegram.optedOutAt instanceof Date);
    assert.equal(user.premium.telegramAlertsEnabled, false);
    assert.equal(user.premium.whatsappAlertsEnabled, true);
    assert.deepEqual(revokedFilter, { user: user._id, consumedAt: null });
  } finally {
    process.env.TELEGRAM_WEBHOOK_SECRET = originalSecret;
    User.findOneAndUpdate = originalFindOneAndUpdate;
    TelegramLinkToken.updateMany = originalUpdateMany;
  }
});
