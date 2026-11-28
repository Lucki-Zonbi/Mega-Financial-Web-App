
// Sprint 2S.3G - Automated Intake Validation Tests

const { test } = require("node:test");
const assert = require("node:assert/strict");

const {
  IntakeValidationError,
  validateMailingAddress,
  validateIdentityInformation,
  validateExpandedIntakeFields
} = require("../utils/intakeValidationUtils");

const address = {
  addressLine1: "100 Example Street",
  city: "Example City",
  state: "MI",
  zipCode: "01234"
};

const identity = {
  identificationType: "state_id",
  issuingState: "MI",
  identificationNumber: "TEST-ID-0001",
  ssn: "000001234"
};

function expectValidationError(callback, field) {
  assert.throws(
    callback,
    (error) =>
      error instanceof IntakeValidationError &&
      error.field === field &&
      error.statusCode === 400
  );
}

test("Valid expanded intake information is accepted", () => {
  const result = validateExpandedIntakeFields(
    address,
    identity
  );

  assert.equal(result.mailingAddress.state, "MI");

  assert.ok(
    result.identityInformation.ssn === identity.ssn
  );
});

test("Mailing address whitespace is normalized", () => {
  const result = validateMailingAddress({
    ...address,
    addressLine1: " 100 Example Street ",
    city: " Example City ",
    state: "mi"
  });

  assert.equal(
    result.addressLine1,
    "100 Example Street"
  );

  assert.equal(result.city, "Example City");
  assert.equal(result.state, "MI");
});

test("Secondary mailing address remains optional", () => {
  for (const value of [undefined, "", " "]) {
    const result = validateMailingAddress({
      ...address,
      addressLine2: value
    });

    assert.equal(result.addressLine2, "");
  }
});

test("ZIP codes preserve leading zeros and ZIP+4", () => {
  for (const zipCode of ["01234", "01234-5678"]) {
    const result = validateMailingAddress({
      ...address,
      zipCode
    });

    assert.equal(result.zipCode, zipCode);
  }
});

test("Invalid mailing address fields are rejected", () => {
  const invalidFields = [
    ["addressLine1", ""],
    ["addressLine1", "A".repeat(151)],
    ["addressLine2", "A".repeat(101)],
    ["city", 123],
    ["city", "A".repeat(101)],
    ["state", "XX"],
    ["zipCode", "ABC12"],
    ["zipCode", 12345]
  ];

  for (const [field, value] of invalidFields) {
    expectValidationError(
      () => validateMailingAddress({
        ...address,
        [field]: value
      }),
      `mailingAddress.${field}`
    );
  }
});

test("Control characters are rejected", () => {
  expectValidationError(
    () => validateMailingAddress({
      ...address,
      addressLine1: "Example\nStreet"
    }),
    "mailingAddress.addressLine1"
  );
});

test("Both approved identification types are accepted", () => {
  for (const identificationType of [
    "drivers_license",
    "state_id"
  ]) {
    const result = validateIdentityInformation({
      ...identity,
      identificationType
    });

    assert.equal(
      result.identificationType,
      identificationType
    );
  }
});

test("Identification number formatting is preserved", () => {
  const result = validateIdentityInformation({
    ...identity,
    identificationNumber: " 000Test-1234 "
  });

  assert.ok(
    result.identificationNumber === "000Test-1234"
  );
});

test("Invalid identification information is rejected", () => {
  const invalidFields = [
    ["identificationType", "passport"],
    ["issuingState", "XX"],
    ["identificationNumber", ""],
    ["identificationNumber", 12345],
    ["identificationNumber", "---"],
    ["identificationNumber", "INVALID!"],
    ["identificationNumber", "A".repeat(31)]
  ];

  for (const [field, value] of invalidFields) {
    expectValidationError(
      () => validateIdentityInformation({
        ...identity,
        [field]: value
      }),
      `identityInformation.${field}`
    );
  }
});

test("Formatted and unformatted SSNs are normalized", () => {
  for (const ssn of [
    "000001234",
    "000-00-1234"
  ]) {
    const result = validateIdentityInformation({
      ...identity,
      ssn
    });

    assert.ok(result.ssn === "000001234");
  }
});

test("Malformed SSNs and incorrect types are rejected", () => {
  const invalidValues = [
    "",
    null,
    undefined,
    123456789,
    ["000001234"],
    "00000123",
    "0000012345",
    "000-AA-1234",
    "0000-0-1234"
  ];

  for (const ssn of invalidValues) {
    expectValidationError(
      () => validateIdentityInformation({
        ...identity,
        ssn
      }),
      "identityInformation.ssn"
    );
  }
});

test("Unexpected fields and encryption envelopes are rejected", () => {
  expectValidationError(
    () => validateIdentityInformation({
      ...identity,
      encryptedSsn: {}
    }),
    "identityInformation"
  );

  expectValidationError(
    () => validateMailingAddress({
      ...address,
      unexpectedField: true
    }),
    "mailingAddress"
  );

  expectValidationError(
    () => validateMailingAddress([]),
    "mailingAddress"
  );
});

test("Validation errors exclude submitted sensitive values", () => {
  const fictionalInvalidValue =
    "FICTIONAL-PRIVATE-SSN-INVALID";

  assert.throws(
    () => validateIdentityInformation({
      ...identity,
      ssn: fictionalInvalidValue
    }),
    (error) =>
      error instanceof IntakeValidationError &&
      !error.message.includes(fictionalInvalidValue) &&
      !JSON.stringify(error).includes(
        fictionalInvalidValue
      ) &&
      !String(error.stack).includes(
        fictionalInvalidValue
      )
  );
});
