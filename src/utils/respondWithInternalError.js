/**
 * @file Shared helper for sanitizing unexpected internal-error responses.
 * @module utils/respondWithInternalError
 */

export const respondWithInternalError = (
  res,
  error,
  {
    code = null,
    message = "Internal Server Error",
    logLabel = "Unexpected internal error:",
  } = {},
) => {
  console.error(logLabel, error);

  const payload = {
    success: false,
    message,
  };

  if (code != null) {
    payload.code = code;
  }

  return res.status(500).json(payload);
};
