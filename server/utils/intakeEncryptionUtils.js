
// Sprint 2S.3C - Tax Intake Authenticated Encryption

const crypto = require("crypto");

const ALGORITHM = "aes-256-gcm";
const ENCRYPTION_VERSION = 1;
const KEY_LENGTH = 32;
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

const ALLOWED_FIELDS = new Set([
  "ssn",
  "identificationNumber"
]);

const ENVELOPE_FIELDS = [
  "version",
  "keyId",
  "iv",
  "authTag",
  "ciphertext"
];

// Validate and decode canonical Base64 values.
function decodeBase64(value, expectedLength) {
  if (typeof value !== "string" || !value.length) {
    throw new Error("Invalid encoded value.");
  }

  const decoded = Buffer.from(value, "base64");

  if (decoded.toString("base64") !== value) {
    throw new Error("Invalid Base64 encoding.");
  }

  if (
    expectedLength !== undefined &&
    decoded.length !== expectedLength
  ) {
    throw new Error("Invalid encoded value length.");
  }

  return decoded;
}

// Validate encryption key identifiers.
function isValidKeyId(keyId) {
  return (
    typeof keyId === "string" &&
    /^[a-zA-Z0-9_-]{1,64}$/.test(keyId)
  );
}

// Load and validate the environment-managed key registry.
function loadKeyRegistry() {
  try {
    const activeKeyId =
      process.env.INTAKE_ENCRYPTION_ACTIVE_KEY_ID;

    const rawRegistry =
      process.env.INTAKE_ENCRYPTION_KEYS;

    if (!isValidKeyId(activeKeyId) || !rawRegistry) {
      throw new Error("Missing encryption configuration.");
    }

    const parsedRegistry = JSON.parse(rawRegistry);

    if (
      !parsedRegistry ||
      typeof parsedRegistry !== "object" ||
      Array.isArray(parsedRegistry)
    ) {
      throw new Error("Invalid key registry.");
    }

    const keys = new Map();

    for (const [keyId, encodedKey] of Object.entries(
      parsedRegistry
    )) {
      if (!isValidKeyId(keyId)) {
        throw new Error("Invalid key identifier.");
      }

      keys.set(
        keyId,
        decodeBase64(encodedKey, KEY_LENGTH)
      );
    }

    if (!keys.has(activeKeyId)) {
      throw new Error("Active encryption key unavailable.");
    }

    return {
      activeKeyId,
      keys
    };
  } catch {
    throw new Error(
      "Tax intake encryption configuration is invalid."
    );
  }
}

// Bind encrypted information to its intended record and field.
function buildAuthenticatedData(context, keyId) {
  if (!context || typeof context !== "object") {
    throw new Error("Invalid encryption context.");
  }

  const clientId = String(
    context.clientId ?? ""
  ).toLowerCase();

  const taxYear = context.taxYear;
  const field = context.field;

  if (
    !/^[a-f0-9]{24}$/.test(clientId) ||
    !Number.isInteger(taxYear) ||
    taxYear < 2000 ||
    taxYear > 2100 ||
    !ALLOWED_FIELDS.has(field) ||
    !isValidKeyId(keyId)
  ) {
    throw new Error("Invalid encryption context.");
  }

  return Buffer.from(
    JSON.stringify([
      "mega-financial-tax-intake",
      ENCRYPTION_VERSION,
      keyId,
      clientId,
      taxYear,
      field
    ]),
    "utf8"
  );
}

// Encrypt a sensitive Tax Intake value.
function encryptIntakeValue(plaintext, context) {
  try {
    if (
      typeof plaintext !== "string" ||
      !plaintext.trim().length ||
      Buffer.byteLength(plaintext, "utf8") > 256
    ) {
      throw new Error("Invalid encryption input.");
    }

    const { activeKeyId, keys } = loadKeyRegistry();

    const key = keys.get(activeKeyId);

    const iv = crypto.randomBytes(IV_LENGTH);

    const aad = buildAuthenticatedData(
      context,
      activeKeyId
    );

    const cipher = crypto.createCipheriv(
      ALGORITHM,
      key,
      iv,
      {
        authTagLength: AUTH_TAG_LENGTH
      }
    );

    cipher.setAAD(aad);

    const ciphertext = Buffer.concat([
      cipher.update(plaintext, "utf8"),
      cipher.final()
    ]);

    const authTag = cipher.getAuthTag();

    return {
      version: ENCRYPTION_VERSION,
      keyId: activeKeyId,
      iv: iv.toString("base64"),
      authTag: authTag.toString("base64"),
      ciphertext: ciphertext.toString("base64")
    };
  } catch {
    throw new Error(
      "Unable to encrypt sensitive tax intake information."
    );
  }
}

// Decrypt and authenticate a sensitive Tax Intake value.
function decryptIntakeValue(envelope, context) {
  try {
    if (
      !envelope ||
      typeof envelope !== "object" ||
      Array.isArray(envelope) ||
      envelope.version !== ENCRYPTION_VERSION ||
      !isValidKeyId(envelope.keyId) ||
      !ENVELOPE_FIELDS.every((field) =>
        Object.prototype.hasOwnProperty.call(
          envelope,
          field
        )
      ) ||
      Object.keys(envelope).length !==
        ENVELOPE_FIELDS.length
    ) {
      throw new Error("Invalid encrypted value.");
    }

    const { keys } = loadKeyRegistry();

    const key = keys.get(envelope.keyId);

    if (!key) {
      throw new Error("Decryption key unavailable.");
    }

    const iv = decodeBase64(
      envelope.iv,
      IV_LENGTH
    );

    const authTag = decodeBase64(
      envelope.authTag,
      AUTH_TAG_LENGTH
    );

    if (
      typeof envelope.ciphertext !== "string" ||
      envelope.ciphertext.length > 344
    ) {
      throw new Error("Invalid ciphertext length.");
    }

    const ciphertext = decodeBase64(
      envelope.ciphertext
    );

    if (ciphertext.length > 256) {
      throw new Error("Invalid ciphertext length.");
    }

    const aad = buildAuthenticatedData(
      context,
      envelope.keyId
    );

    const decipher = crypto.createDecipheriv(
      ALGORITHM,
      key,
      iv,
      {
        authTagLength: AUTH_TAG_LENGTH
      }
    );

    decipher.setAAD(aad);
    decipher.setAuthTag(authTag);

    const plaintext = Buffer.concat([
      decipher.update(ciphertext),
      decipher.final()
    ]);

    return plaintext.toString("utf8");
  } catch {
    throw new Error(
      "Unable to decrypt sensitive tax intake information."
    );
  }
}

module.exports = {
  encryptIntakeValue,
  decryptIntakeValue
};
