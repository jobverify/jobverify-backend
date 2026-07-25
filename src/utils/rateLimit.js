import rateLimit, { ipKeyGenerator } from "express-rate-limit";

const TRUE_VALUES = new Set(["1", "true", "yes", "on"]);
const FALSE_VALUES = new Set(["0", "false", "no", "off"]);

const normalizeEnvValue = (value) => String(value ?? "").trim().toLowerCase();

export const isRateLimitingEnabled = (env = process.env) => {
  const explicitValue = normalizeEnvValue(env.ENABLE_RATE_LIMITING);
  if (TRUE_VALUES.has(explicitValue)) return true;
  if (FALSE_VALUES.has(explicitValue)) return false;

  return normalizeEnvValue(env.NODE_ENV) === "production";
};

export const createRateLimiter = (options, env = process.env) => {
  if (!isRateLimitingEnabled(env)) {
    return (_req, _res, next) => next();
  }

  return rateLimit(options);
};

export { ipKeyGenerator };
