import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";

import { processTelegramWebhook } from "../src/controllers/telegramController.js";
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
  const originalFindById = User.findById;
  const originalFetch = global.fetch;
  const rawToken = "single-use-token";
  const user = {
    _id: "507f1f77bcf86cd799439011",
    premium: { telegramAlertsEnabled: false },
    telegram: {},
    saveCount: 0,
    async save() {
      this.saveCount += 1;
      return this;
    },
  };
  let available = true;
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
  User.findById = async () => user;
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
    assert.equal(user.saveCount, 1);
    assert.equal(sentBodies.length, 1);
    assert.equal(sentBodies[0].chat_id, "1001");

    const replayResponse = createResponseDouble();
    await processTelegramWebhook(request, replayResponse);
    assert.equal(replayResponse.statusCode, 200);
    assert.equal(user.saveCount, 1);
    assert.equal(sentBodies.length, 1);
  } finally {
    process.env.TELEGRAM_WEBHOOK_SECRET = originalSecret;
    process.env.TELEGRAM_ENABLED = originalEnabled;
    process.env.TELEGRAM_BOT_TOKEN = originalToken;
    TelegramLinkToken.findOneAndUpdate = originalFindOneAndUpdate;
    User.findById = originalFindById;
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
  const originalFindOne = User.findOne;
  const user = {
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
    async save() { return this; },
  };
  process.env.TELEGRAM_WEBHOOK_SECRET = "webhook-secret";
  User.findOne = async (filter) => {
    assert.deepEqual(filter, { "telegram.chatId": "1001" });
    return user;
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
  } finally {
    process.env.TELEGRAM_WEBHOOK_SECRET = originalSecret;
    User.findOne = originalFindOne;
  }
});
