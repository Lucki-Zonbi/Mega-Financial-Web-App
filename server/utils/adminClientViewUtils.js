const DEFAULT_ADMIN_CLIENT_LIMIT = 10;
const MAX_ADMIN_CLIENT_LIMIT = 25;

function escapeRegularExpression(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function parseBoundedPositiveInteger(
  value,
  fallback,
  maximum = Number.MAX_SAFE_INTEGER
) {
  const parsedValue = Number.parseInt(value, 10);

  if (!Number.isInteger(parsedValue) || parsedValue < 1) {
    return fallback;
  }

  return Math.min(parsedValue, maximum);
}

function buildSafeClientDirectoryEntry(user) {
  return {
    id: user._id,
    fullName: user.fullName,
    email: user.email,
    isEmailVerified: user.isEmailVerified,
    twoFactorEnabled: user.twoFactorEnabled,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt
  };
}

function buildSafeClientAccountSummary(user) {
  return {
    id: user._id,
    fullName: user.fullName,
    email: user.email,
    role: user.role,
    isEmailVerified: user.isEmailVerified,
    twoFactorEnabled: user.twoFactorEnabled,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt
  };
}

module.exports = {
  DEFAULT_ADMIN_CLIENT_LIMIT,
  MAX_ADMIN_CLIENT_LIMIT,
  escapeRegularExpression,
  parseBoundedPositiveInteger,
  buildSafeClientDirectoryEntry,
  buildSafeClientAccountSummary
};
