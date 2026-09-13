export const MAX_SUGGESTION_WORDS = 100;
export const MAX_DAILY_SUGGESTIONS = 5;

const INDIA_OFFSET_MS = 330 * 60 * 1000;

export const countSuggestionWords = (value) => {
  const trimmed = String(value ?? "").trim();
  return trimmed ? trimmed.split(/\s+/u).length : 0;
};

export const getIndiaDayKey = (date = new Date()) =>
  new Date(date.getTime() + INDIA_OFFSET_MS).toISOString().slice(0, 10);
