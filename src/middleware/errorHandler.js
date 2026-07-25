export class APIError extends Error {
  constructor(statusCode, message, details = null) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
  }
}

export const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const message = err.message || "Internal Server Error";
  const details = err.details || null;
  const isProduction = process.env.NODE_ENV === "production";
  const isSafeClientError =
    err instanceof APIError || (statusCode >= 400 && statusCode < 500);
  const responseMessage =
    isProduction && !isSafeClientError ? "Internal Server Error" : message;

  console.error(`[${new Date().toISOString()}] Error:`, {
    statusCode,
    message,
    details,
    stack: err.stack,
  });

  const payload = {
    success: false,
    message: responseMessage,
  };

  if (!isProduction && details !== null) {
    payload.details = details;
  } else if (isSafeClientError && details !== null) {
    payload.details = details;
  }

  return res.status(statusCode).json(payload);
};
export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};
