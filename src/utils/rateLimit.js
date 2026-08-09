import rateLimit, { ipKeyGenerator } from "express-rate-limit";

const TRUE_VALUES = new Set(["1", "true", "yes", "on"]);
const FALSE_VALUES = new Set(["0", "false", "no", "off"]);
const READ_ONLY_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);
const EXPENSIVE_JOB_READ_PATHS = new Set([
  "/api/jobs",
  "/api/jobs/search",
  "/api/jobs/meta",
  "/api/jobs/meta/companies",
]);

const normalizeEnvValue = (value) => String(value ?? "").trim().toLowerCase();
const normalizeMethod = (value) => String(value ?? "").trim().toUpperCase();

export const getRequestPath = (req = {}) => String(req.originalUrl ?? req.url ?? "").split("?")[0];

export const isReadOnlyRequest = (req = {}) => READ_ONLY_METHODS.has(normalizeMethod(req.method));

export const getApiRateLimitProfile = (req = {}) => {
  const path = getRequestPath(req);

  if (path === "/api/billing/webhook") {
    return "skip";
  }

  if (path.startsWith("/api/auth")) {
    return "auth";
  }

  if (EXPENSIVE_JOB_READ_PATHS.has(path)) {
    return "expensive-search";
  }

  if (isReadOnlyRequest(req)) {
    return "cheap-read";
  }

  return "mutation";
};

export const isRateLimitingEnabled = (env = process.env) => {
  const explicitValue = normalizeEnvValue(env.ENABLE_RATE_LIMITING);
  if (TRUE_VALUES.has(explicitValue)) return true;
  if (FALSE_VALUES.has(explicitValue)) return false;

  return normalizeEnvValue(env.NODE_ENV) === "production";
};

const setHeader = (res, name, value) => {
  if (typeof res?.set === "function") {
    res.set(name, value);
    return;
  }

  if (typeof res?.setHeader === "function") {
    res.setHeader(name, value);
  }
};

export const createApiRateLimitHandler = (config) => {
  const normalizedConfig = typeof config === "string"
    ? { message: config }
    : { ...(config ?? {}) };

  return (req, res, _next, options = {}) => {
    const now = Date.now();
    const resetTimeMs = req?.rateLimit?.resetTime instanceof Date
      ? req.rateLimit.resetTime.getTime() - now
      : null;
    const retryAfterSeconds = Math.max(
      1,
      Math.ceil(
        (
          Number.isFinite(normalizedConfig.retryAfterSeconds)
            ? normalizedConfig.retryAfterSeconds * 1000
            : Number.isFinite(resetTimeMs) && resetTimeMs > 0
              ? resetTimeMs
              : Number(options?.windowMs ?? 15 * 60 * 1000)
        ) / 1000,
      ),
    );

    setHeader(res, "Retry-After", String(retryAfterSeconds));
    setHeader(res, "Cache-Control", "no-store");

    return res.status(429).json({
      code: 429,
      error: "rate_limited",
      success: false,
      message: String(normalizedConfig.message ?? "Too many requests"),
    });
  };
};

export const createRateLimiter = (options, env = process.env) => {
  if (!isRateLimitingEnabled(env)) {
    return (_req, _res, next) => next();
  }

  return rateLimit(options);
};

export { ipKeyGenerator };
