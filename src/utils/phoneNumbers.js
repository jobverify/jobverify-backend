const DEFAULT_COUNTRY_CODE = String(process.env.WHATSAPP_DEFAULT_COUNTRY_CODE || "IN")
  .trim()
  .toUpperCase();

export const normalizePhoneE164 = (value, defaultCountry = DEFAULT_COUNTRY_CODE) => {
  const trimmed = String(value || "").trim();
  if (!trimmed) return null;

  const digits = trimmed.replace(/[^\d+]/g, "");
  if (digits.startsWith("+") && /^\+\d{8,15}$/.test(digits)) {
    return digits;
  }

  const numeric = digits.replace(/\D/g, "");
  if (defaultCountry === "IN" && /^\d{10}$/.test(numeric)) {
    return `+91${numeric}`;
  }

  return null;
};
