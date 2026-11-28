
// Sprint 2S.3G - Automated Encryption Security Tests

const {
  test,
  beforeEach,
  after
} = require("node:test");

const assert = require("node:assert/strict");
const crypto = require("node:crypto");

const {
  encryptIntakeValue,
  decryptIntakeValue
} = require("../utils/intakeEncryptionUtils");

const originalActiveKey =
  process.env.INTAKE_ENCRYPTION_ACTIVE_KEY_ID;

const originalKeyRegistry =
  process.env.INTAKE_ENCRYPTION_KEYS;

const keyV1 = crypto.randomBytes(32).toString("base64");
const keyV2 = crypto.randomBytes(32).toString("base64");

const context = {
  clientId: "000000000000000000000001",
  taxYear: 2026,
  field: "ssn"
};

const fictionalSsn = "000001234";

const encryptionError = {
  name: "Error",
  message: "Unable to encrypt sensitive tax intake information."
};

const decryptionError = {
  name: "Error",
  message: "Unable to decrypt sensitive tax intake information."
};

function configureKeys(activeKeyId, registry) {
  process.env.INTAKE_ENCRYPTION_ACTIVE_KEY_ID =
    activeKeyId;

  process.env.INTAKE_ENCRYPTION_KEYS =
    JSON.stringify(registry);
}

beforeEach(() => {
  configureKeys("test-v1", {
    "test-v1": keyV1
  });
});

after(() => {
  if (originalActiveKey === undefined) {
    delete process.env.INTAKE_ENCRYPTION_ACTIVE_KEY_ID;
  } else {
    process.env.INTAKE_ENCRYPTION_ACTIVE_KEY_ID =
      originalActiveKey;
  }

  if (originalKeyRegistry === undefined) {
    delete process.env.INTAKE_ENCRYPTION_KEYS;
  } else {
    process.env.INTAKE_ENCRYPTION_KEYS =
      originalKeyRegistry;
  }
});

test("Encryption and decryption round trip", () => {
  const encrypted = encryptIntakeValue(
    fictionalSsn,
    context
  );

  assert.ok(
    decryptIntakeValue(encrypted, context) ===
      fictionalSsn
  );

  assert.ok(
    encrypted.ciphertext !== fictionalSsn
  );

  assert.equal(encrypted.version, 1);
  assert.equal(encrypted.keyId, "test-v1");
});

test("Encrypted envelope has exactly five fields", () => {
  const encrypted = encryptIntakeValue(
    fictionalSsn,
    context
  );

  assert.deepEqual(
    Object.keys(encrypted).sort(),
    [
      "version",
      "keyId",
      "iv",
      "authTag",
      "ciphertext"
    ].sort()
  );

  assert.equal(
    Buffer.from(encrypted.iv, "base64").length,
    12
  );

  assert.equal(
    Buffer.from(encrypted.authTag, "base64").length,
    16
  );
});

test("Repeated encryption uses randomized IVs", () => {
  const first = encryptIntakeValue(
    fictionalSsn,
    context
  );

  const second = encryptIntakeValue(
    fictionalSsn,
    context
  );

  assert.ok(first.iv !== second.iv);
});

test("Tampered authentication tag is rejected", () => {
  const encrypted = encryptIntakeValue(
    fictionalSsn,
    context
  );

  const tag = Buffer.from(
    encrypted.authTag,
    "base64"
  );

  tag[0] ^= 1;

  assert.throws(
    () => decryptIntakeValue(
      {
        ...encrypted,
        authTag: tag.toString("base64")
      },
      context
    ),
    decryptionError
  );
});

test("Tampered ciphertext is rejected", () => {
  const encrypted = encryptIntakeValue(
    fictionalSsn,
    context
  );

  const ciphertext = Buffer.from(
    encrypted.ciphertext,
    "base64"
  );

  ciphertext[0] ^= 1;

  assert.throws(
    () => decryptIntakeValue(
      {
        ...encrypted,
        ciphertext: ciphertext.toString("base64")
      },
      context
    ),
    decryptionError
  );
});

test("Incorrect client, tax year and field are rejected", () => {
  const encrypted = encryptIntakeValue(
    fictionalSsn,
    context
  );

  const incorrectContexts = [
    {
      ...context,
      clientId: "000000000000000000000002"
    },
    {
      ...context,
      taxYear: 2025
    },
    {
      ...context,
      field: "identificationNumber"
    }
  ];

  for (const incorrect of incorrectContexts) {
    assert.throws(
      () => decryptIntakeValue(
        encrypted,
        incorrect
      ),
      decryptionError
    );
  }
});

test("Malformed encrypted envelopes are rejected", () => {
  const encrypted = encryptIntakeValue(
    fictionalSsn,
    context
  );

  const malformedEnvelopes = [
    null,
    [],
    {},
    {
      ...encrypted,
      version: 99
    },
    {
      ...encrypted,
      iv: "INVALID!"
    },
    {
      ...encrypted,
      authTag: ""
    },
    {
      ...encrypted,
      ciphertext: ""
    },
    {
      ...encrypted,
      ciphertext: "A".repeat(348)
    },
    {
      ...encrypted,
      unexpectedField: true
    }
  ];

  for (const malformed of malformedEnvelopes) {
    assert.throws(
      () => decryptIntakeValue(
        malformed,
        context
      ),
      decryptionError
    );
  }
});

test("Invalid encryption inputs are rejected", () => {
  const invalidInputs = [
    "",
    " ",
    null,
    123456789,
    [],
    "A".repeat(257)
  ];

  for (const value of invalidInputs) {
    assert.throws(
      () => encryptIntakeValue(value, context),
      encryptionError
    );
  }
});

test("Key rotation preserves historical decryption", () => {
  const historical = encryptIntakeValue(
    fictionalSsn,
    context
  );

  configureKeys("test-v2", {
    "test-v1": keyV1,
    "test-v2": keyV2
  });

  const current = encryptIntakeValue(
    fictionalSsn,
    context
  );

  assert.equal(historical.keyId, "test-v1");
  assert.equal(current.keyId, "test-v2");

  assert.ok(
    decryptIntakeValue(historical, context) ===
      fictionalSsn
  );

  assert.ok(
    decryptIntakeValue(current, context) ===
      fictionalSsn
  );
});

test("Missing historical key prevents decryption", () => {
  const historical = encryptIntakeValue(
    fictionalSsn,
    context
  );

  configureKeys("test-v2", {
    "test-v2": keyV2
  });

  assert.throws(
    () => decryptIntakeValue(
      historical,
      context
    ),
    decryptionError
  );
});

test("Incorrect key material prevents decryption", () => {
  const encrypted = encryptIntakeValue(
    fictionalSsn,
    context
  );

  configureKeys("test-v1", {
    "test-v1": keyV2
  });

  assert.throws(
    () => decryptIntakeValue(
      encrypted,
      context
    ),
    decryptionError
  );
});

test("Invalid encryption configuration fails securely", () => {
  const configurations = [
    ["missing-key", {}],
    ["test-v1", { "test-v1": "INVALID!" }],
    [
      "test-v1",
      {
        "test-v1": crypto
          .randomBytes(16)
          .toString("base64")
      }
    ]
  ];

  for (const [activeKey, registry] of configurations) {
    configureKeys(activeKey, registry);

    assert.throws(
      () => encryptIntakeValue(
        fictionalSsn,
        context
      ),
      encryptionError
    );
  }
});
