/**
 * @file Authenticated Telegram Bot API webhook handling.
 * @module controllers/telegramController
 */

import { createHash, timingSafeEqual } from "node:crypto";
import User from "../models/User.js";
import { consumeTelegramLinkToken } from "../services/telegramLinkService.js";
import { getTelegramProvider } from "../services/telegramProvider.js";

const SECRET_HEADER = "X-Telegram-Bot-Api-Secret-Token";

const digestSecret = (value) =>
  createHash("sha256").update(String(value ?? "")).digest();

const secretsMatch = (provided, expected) =>
  timingSafeEqual(digestSecret(provided), digestSecret(expected));

const sendAccepted = (res) => res.status(200).json({ ok: true });

const unlinkTelegram = async (user, now = new Date()) => {
  user.telegram.chatId = null;
  user.telegram.username = null;
  user.telegram.linkedAt = null;
  user.telegram.optedOutAt = now;
  user.premium.telegramAlertsEnabled = false;
  await user.save();
};

export const processTelegramWebhook = async (req, res) => {
  const expectedSecret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (!expectedSecret) {
    return res.status(503).json({
      success: false,
      message: "Telegram webhook is not configured.",
    });
  }

  const providedSecret = req.get?.(SECRET_HEADER)
    ?? req.headers?.[SECRET_HEADER.toLowerCase()];
  if (!providedSecret || !secretsMatch(providedSecret, expectedSecret)) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized Telegram webhook.",
    });
  }

  const message = req.body?.message;
  if (message?.chat?.type !== "private") {
    return sendAccepted(res);
  }

  const text = typeof message.text === "string" ? message.text.trim() : "";
  const chatId = message.chat.id;
  if (chatId === undefined || chatId === null) {
    return sendAccepted(res);
  }

  const startMatch = text.match(/^\/start(?:@[A-Za-z0-9_]+)?\s+([A-Za-z0-9_-]{1,500})$/u);
  if (startMatch) {
    const userId = await consumeTelegramLinkToken(startMatch[1]);
    if (!userId) return sendAccepted(res);

    const user = await User.findById(userId);
    if (!user) return sendAccepted(res);

    user.telegram.chatId = String(chatId);
    user.telegram.username = message.chat.username
      ? String(message.chat.username).slice(0, 80)
      : null;
    user.telegram.linkedAt = new Date();
    user.telegram.optedOutAt = null;
    await user.save();

    await getTelegramProvider().sendTextMessage({
      chatId: String(chatId),
      body: "Your JobVerify Telegram alerts are linked.",
    });
    return sendAccepted(res);
  }

  if (/^\/stop(?:@[A-Za-z0-9_]+)?$/u.test(text)) {
    const user = await User.findOne({ "telegram.chatId": String(chatId) });
    if (user) await unlinkTelegram(user);
  }

  return sendAccepted(res);
};
