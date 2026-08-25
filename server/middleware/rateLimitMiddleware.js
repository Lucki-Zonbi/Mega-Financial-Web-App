const rateLimit = require("express-rate-limit");

function getPositiveNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

const apiWindowMinutes = getPositiveNumber(
  process.env.API_RATE_LIMIT_WINDOW_MINUTES,
  15
);

const apiMaxRequests = getPositiveNumber(
  process.env.API_RATE_LIMIT_MAX_REQUESTS,
  300
);

const authWindowMinutes = getPositiveNumber(
  process.env.AUTH_RATE_LIMIT_WINDOW_MINUTES,
  15
);

const authMaxRequests = getPositiveNumber(
  process.env.AUTH_RATE_LIMIT_MAX_REQUESTS,
  20
);

const apiLimiter = rateLimit({
  windowMs: apiWindowMinutes * 60 * 1000,
  max: apiMaxRequests,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many requests. Please wait a few minutes and try again."
  }
});

const authLimiter = rateLimit({
  windowMs:
    authWindowMinutes *
    60 *
    1000,

  max:
    authMaxRequests,

  standardHeaders:
    true,

  legacyHeaders:
    false,

  message: {
    success:
      false,

    message:
      "Too many login or registration attempts. Please wait and try again."
  }
});

const accountSecurityLimiter =
  rateLimit({
    windowMs:
      15 *
      60 *
      1000,

    max:
      5,

    standardHeaders:
      true,

    legacyHeaders:
      false,

    message: {
      success:
        false,

      message:
        "Too many account security requests. Please wait and try again."
    }
  });

module.exports = {
  apiLimiter,
  authLimiter,
  accountSecurityLimiter
};
