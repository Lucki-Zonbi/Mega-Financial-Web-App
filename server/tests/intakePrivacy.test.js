
// Sprint 2S.3G - Automated Intake Privacy Tests

const {
  test,
  before,
  after
} = require("node:test");

const assert = require("node:assert/strict");
const crypto = require("node:crypto");

const TaxIntake = require("../models/TaxIntake");

const {
  encryptIntakeValue
} = require("../utils/intakeEncryptionUtils");

const {
  maskSsn,
  maskIdentificationNumber,
  buildMaskedIdentityInformation,
  buildSafeIntakeResponse
} = require("../utils/intakePrivacyUtils");

const originalActiveKey =
  process.env.INTAKE_ENCRYPTION_ACTIVE_KEY_ID;

const originalKeyRegistry =
  process.env.INTAKE_ENCRYPTION_KEYS;

before(() => {
  process.env.INTAKE_ENCRYPTION_ACTIVE_KEY_ID =
    "privacy-test-v1";

  process.env.INTAKE_ENCRYPTION_KEYS =
    JSON.stringify({
      "privacy-test-v1":
        crypto.randomBytes(32).toString("base64")
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

const context = {
  clientId: "000000000000000000000001",
  taxYear: 2026
};

const historicalRecord = {
  user: context.clientId,
  taxYear: context.taxYear,

  clientInformation: {
    firstName: "Fictional",
    lastName: "Client",
    email: "fictional@example.com",
    phone: "555-0100",
    filingStatus: "Single"
  }
};

function createExpandedRecord() {
  return {
    ...historicalRecord,

    mailingAddress: {
      addressLine1: "100 Example Street",
      city: "Example City",
      state: "MI",
      zipCode: "01234"
    },

    identityInformation: {
      identificationType: "state_id",
      issuingState: "MI",

      encryptedSsn: encryptIntakeValue(
        "000001234",
        {
          ...context,
          field: "ssn"
        }
      ),

      encryptedIdentificationNumber:
        encryptIntakeValue(
          "TEST-ID-0001",
          {
            ...context,
            field: "identificationNumber"
          }
        )
    }
  };
}

const maskedIdentityError = {
  name: "Error",
  message: "Unable to prepare masked identity information."
};

test("SSN masking preserves the final four digits", () => {
  assert.ok(
    maskSsn("000001234") === "***-**-1234"
  );

  assert.ok(
    maskSsn("000000001") === "***-**-0001"
  );
});

test("Identification masking reveals at most four characters", () => {
  assert.ok(
    maskIdentificationNumber("TEST-ID-0001") ===
      "****0001"
  );

  assert.ok(
    maskIdentificationNumber("A1234") ===
      "****1234"
  );
});

test("Short identification numbers are fully concealed", () => {
  for (const value of [
    "A",
    "A1",
    "123",
    "AB12",
    "A-1"
  ]) {
    assert.ok(
      maskIdentificationNumber(value) === "****"
    );
  }
});

test("Invalid masking inputs are rejected", () => {
  for (const value of ["", null, 12345]) {
    assert.throws(() => maskSsn(value));

    assert.throws(
      () => maskIdentificationNumber(value)
    );
  }
});

test("Historical Mongoose records remain valid", async () => {
  const intake = new TaxIntake(historicalRecord);

  await intake.validate();

  assert.equal(intake.mailingAddress, undefined);

  assert.equal(
    intake.identityInformation,
    undefined
  );
});

test("Expanded encrypted Mongoose records are valid", async () => {
  const intake = new TaxIntake(
    createExpandedRecord()
  );

  await intake.validate();

  assert.equal(
    intake.mailingAddress.zipCode,
    "01234"
  );

  assert.equal(
    intake.mailingAddress.addressLine2,
    ""
  );

  const masked = buildMaskedIdentityInformation(
    intake
  );

  assert.ok(
    masked.maskedSsn === "***-**-1234"
  );

  assert.ok(
    masked.maskedIdentificationNumber ===
      "****0001"
  );
});

test("Malformed encrypted envelopes fail schema validation", async () => {
  const record = createExpandedRecord();

  record.identityInformation.encryptedSsn.iv =
    "INVALID!";

  const intake = new TaxIntake(record);

  await assert.rejects(
    () => intake.validate(),
    (error) =>
      error.name === "ValidationError" &&
      Boolean(
        error.errors[
          "identityInformation.encryptedSsn.iv"
        ]
      )
  );
});

test("Unexpected plaintext identity fields fail schema validation", async () => {
  const record = createExpandedRecord();

  record.identityInformation.ssn = "000001234";

  await assert.rejects(async () => {
    const intake = new TaxIntake(record);

    await intake.validate();
  });
});

test("Encrypted fields have default selection exclusion", () => {
  const identitySchema =
    TaxIntake.schema.path("identityInformation").schema;

  assert.equal(
    identitySchema.path("encryptedSsn").options.select,
    false
  );

  assert.equal(
    identitySchema.path(
      "encryptedIdentificationNumber"
    ).options.select,
    false
  );
});

test("Existing unique compound index is preserved", () => {
  assert.ok(
    TaxIntake.schema.indexes().some(
      ([fields, options]) =>
        fields.user === 1 &&
        fields.taxYear === 1 &&
        options.unique === true
    )
  );
});

test("Safe response excludes encrypted Mongoose fields", () => {
  const intake = new TaxIntake(
    createExpandedRecord()
  );

  const safe = buildSafeIntakeResponse(intake);
  const serialized = JSON.stringify(safe);

  for (const forbidden of [
    "encryptedSsn",
    "encryptedIdentificationNumber",
    "ciphertext",
    "authTag",
    "keyId",
    "000001234",
    "TEST-ID-0001"
  ]) {
    assert.ok(!serialized.includes(forbidden));
  }

  assert.equal(
    safe.identityInformation.identificationType,
    "state_id"
  );

  assert.equal(
    safe.mailingAddress.zipCode,
    "01234"
  );
});

test("Safe response excludes unexpected plaintext fields", () => {
  const record = createExpandedRecord();

  record.identityInformation.ssn =
    "FICTIONAL-PRIVATE-SSN";

  record.identityInformation.identificationNumber =
    "FICTIONAL-PRIVATE-ID";

  record.unexpectedField =
    "FICTIONAL-PRIVATE-FIELD";

  const serialized = JSON.stringify(
    buildSafeIntakeResponse(record)
  );

  for (const forbidden of [
    "FICTIONAL-PRIVATE-SSN",
    "FICTIONAL-PRIVATE-ID",
    "FICTIONAL-PRIVATE-FIELD"
  ]) {
    assert.ok(!serialized.includes(forbidden));
  }
});

test("Historical responses omit unavailable identity information", () => {
  const safe = buildSafeIntakeResponse(
    historicalRecord
  );

  assert.equal(safe.identityInformation, null);
  assert.equal(safe.mailingAddress, null);

  assert.equal(
    buildMaskedIdentityInformation(historicalRecord),
    null
  );
});

test("Missing encrypted fields fail securely", () => {
  const record = createExpandedRecord();

  delete record.identityInformation.encryptedSsn;

  assert.throws(
    () => buildMaskedIdentityInformation(record),
    maskedIdentityError
  );
});

test("Incorrect record contexts fail securely", () => {
  const record = createExpandedRecord();

  assert.throws(
    () => buildMaskedIdentityInformation({
      ...record,
      user: "000000000000000000000002"
    }),
    maskedIdentityError
  );

  assert.throws(
    () => buildMaskedIdentityInformation({
      ...record,
      taxYear: 2025
    }),
    maskedIdentityError
  );
});

test("Tampered identity envelopes fail securely", () => {
  const record = createExpandedRecord();

  const tag = Buffer.from(
    record.identityInformation.encryptedSsn.authTag,
    "base64"
  );

  tag[0] ^= 1;

  record.identityInformation.encryptedSsn.authTag =
    tag.toString("base64");

  assert.throws(
    () => buildMaskedIdentityInformation(record),
    maskedIdentityError
  );
});
