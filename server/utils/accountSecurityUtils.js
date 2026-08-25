const crypto = require("crypto");

const EMAIL_VERIFICATION_TTL_MINUTES =
  24 * 60;

const PASSWORD_RESET_TTL_MINUTES =
  30;

function hashAccountSecurityToken(
  token
) {
  return crypto
    .createHash("sha256")
    .update(
      String(token || ""),
      "utf8"
    )
    .digest("hex");
}

function createAccountSecurityToken(
  ttlMinutes
) {
  const token =
    crypto
      .randomBytes(32)
      .toString("hex");

  return {
    token,

    tokenHash:
      hashAccountSecurityToken(
        token
      ),

    expiresAt:
      new Date(
        Date.now() +
          ttlMinutes *
            60 *
            1000
      )
  };
}

function createEmailVerificationToken() {
  return createAccountSecurityToken(
    EMAIL_VERIFICATION_TTL_MINUTES
  );
}

function createPasswordResetToken() {
  return createAccountSecurityToken(
    PASSWORD_RESET_TTL_MINUTES
  );
}

module.exports = {
  createEmailVerificationToken,
  createPasswordResetToken,
  hashAccountSecurityToken
};
