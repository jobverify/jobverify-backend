/**
 * @file WhatsApp provider abstraction for alert delivery.
 * @module services/whatsappProvider
 */

const TRUE_VALUES = new Set(["1", "true", "yes", "on"]);

const isEnabled = () =>
  TRUE_VALUES.has(String(process.env.WHATSAPP_ENABLED || "false").trim().toLowerCase());

const createMockProvider = () => ({
  name: "mock",
  async sendTextMessage({ to, body }) {
    return {
      providerName: "mock",
      providerMessageId: `mock_whatsapp_${Date.now()}`,
      to,
      body,
    };
  },
});

const createMetaProvider = () => ({
  name: "meta",
  async sendTextMessage({ to, body, signal }) {
    if (!isEnabled()) {
      throw new Error("WhatsApp delivery is disabled.");
    }

    const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    if (!accessToken || !phoneNumberId) {
      throw new Error("Meta WhatsApp credentials are not configured.");
    }

    const response = await fetch(
      `https://graph.facebook.com/v20.0/${phoneNumberId}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to,
          type: "text",
          text: {
            preview_url: false,
            body,
          },
        }),
        signal,
      },
    );

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data?.error?.message || "Meta WhatsApp send failed.");
    }

    return {
      providerName: "meta",
      providerMessageId: data?.messages?.[0]?.id || null,
      raw: data,
    };
  },
});

export const getWhatsappProvider = () => {
  const providerName = String(process.env.WHATSAPP_PROVIDER || "mock")
    .trim()
    .toLowerCase();

  if (providerName === "meta") {
    return createMetaProvider();
  }

  return createMockProvider();
};

export const isWhatsappDeliveryEnabled = () => isEnabled();
