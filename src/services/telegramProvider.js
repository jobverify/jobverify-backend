/**
 * @file Telegram Bot API provider abstraction for alert delivery.
 * @module services/telegramProvider
 */

const TRUE_VALUES = new Set(["1", "true", "yes", "on"]);

export const isTelegramDeliveryEnabled = () =>
  TRUE_VALUES.has(String(process.env.TELEGRAM_ENABLED || "false").trim().toLowerCase());

const createTelegramProvider = () => ({
  name: "telegram",
  async sendTextMessage({ chatId, body, signal }) {
    if (!isTelegramDeliveryEnabled()) {
      throw new Error("Telegram delivery is disabled.");
    }

    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    if (!botToken) {
      throw new Error("Telegram bot credentials are not configured.");
    }

    let response;
    try {
      response = await fetch(
        `https://api.telegram.org/bot${botToken}/sendMessage`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: chatId,
            text: body,
            disable_web_page_preview: true,
          }),
          signal,
        },
      );
    } catch {
      throw new Error("Telegram send failed.");
    }

    const data = await response.json().catch(() => ({}));
    if (!response.ok || data?.ok !== true || data?.result?.message_id === undefined) {
      throw Object.assign(new Error("Telegram send failed."), {
        statusCode: response.status,
      });
    }

    return {
      providerName: "telegram",
      providerMessageId: String(data.result.message_id),
    };
  },
});

export const getTelegramProvider = () => createTelegramProvider();
