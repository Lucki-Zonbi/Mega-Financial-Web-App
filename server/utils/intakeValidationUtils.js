
// Sprint 2S.3E - Tax Intake Validation and Normalization

const US_STATE_CODES = new Set([
  "AL", "AK", "AZ", "AR", "CA",
  "CO", "CT", "DE", "DC", "FL",
  "GA", "HI", "ID", "IL", "IN",
  "IA", "KS", "KY", "LA", "ME",
  "MD", "MA", "MI", "MN", "MS",
  "MO", "MT", "NE", "NV", "NH",
  "NJ", "NM", "NY", "NC", "ND",
  "OH", "OK", "OR", "PA", "RI",
  "SC", "SD", "TN", "TX", "UT",
  "VT", "VA", "WA", "WV", "WI",
  "WY"
]);

const IDENTIFICATION_TYPES = new Set([
  "drivers_license",
  "state_id"
]);

const MAILING_ADDRESS_FIELDS = [
  "addressLine1",
  "addressLine2",
  "city",
  "state",
  "zipCode"
];

const IDENTITY_INFORMATION_FIELDS = [
  "identificationType",
  "issuingState",
  "identificationNumber",
  "ssn"
];

const IDENTITY_SUBMISSION_FIELDS = [
  ...IDENTITY_INFORMATION_FIELDS,
  "replaceIdentificationNumber",
  "replaceSsn"
];

// Sanitized validation error.
class IntakeValidationError extends Error {
  constructor(field, message) {
    super(message);

    this.name = "IntakeValidationError";
    this.field = field;
    this.statusCode = 400;
  }
}

// Reject unexpected object structures and fields.
function validateObject(value, field, allowedFields) {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    (
      Object.getPrototypeOf(value) !== Object.prototype &&
      Object.getPrototypeOf(value) !== null
    )
  ) {
    throw new IntakeValidationError(
      field,
      "Please provide valid intake information."
    );
  }

  if (
    Object.keys(value).some(
      (key) => !allowedFields.includes(key)
    )
  ) {
    throw new IntakeValidationError(
      field,
      "Unexpected intake information fields."
    );
  }
}

// Validate and normalize required text fields.
function normalizeRequiredText(
  value,
  field,
  label,
  maximumLength
) {
  if (typeof value !== "string") {
    throw new IntakeValidationError(
      field,
      `${label} must be provided as text.`
    );
  }

  if (/[\u0000-\u001F\u007F-\u009F]/.test(value)) {
    throw new IntakeValidationError(
      field,
      `${label} contains invalid characters.`
    );
  }

  const normalized = value.trim();

  if (!normalized.length) {
    throw new IntakeValidationError(
      field,
      `${label} is required.`
    );
  }

  if (normalized.length > maximumLength) {
    throw new IntakeValidationError(
      field,
      `${label} exceeds the permitted length.`
    );
  }

  return normalized;
}

// Validate optional text fields.
function normalizeOptionalText(
  value,
  field,
  label,
  maximumLength
) {
  if (value === undefined || value === "") {
    return "";
  }

  if (
    typeof value === "string" &&
    !/[\u0000-\u001F\u007F-\u009F]/.test(value) &&
    value.trim() === ""
  ) {
    return "";
  }

  return normalizeRequiredText(
    value,
    field,
    label,
    maximumLength
  );
}

// Validate US state and DC abbreviations.
function normalizeState(value, field, label) {
  const normalized = normalizeRequiredText(
    value,
    field,
    label,
    2
  ).toUpperCase();

  if (!US_STATE_CODES.has(normalized)) {
    throw new IntakeValidationError(
      field,
      `${label} must be a valid state abbreviation.`
    );
  }

  return normalized;
}

// Validate and normalize ZIP codes.
function normalizeZipCode(value) {
  const normalized = normalizeRequiredText(
    value,
    "mailingAddress.zipCode",
    "ZIP code",
    10
  );

  if (!/^[0-9]{5}(-[0-9]{4})?$/.test(normalized)) {
    throw new IntakeValidationError(
      "mailingAddress.zipCode",
      "Please provide a valid ZIP code."
    );
  }

  return normalized;
}

// Validate the complete mailing address.
function validateMailingAddress(value) {
  validateObject(
    value,
    "mailingAddress",
    MAILING_ADDRESS_FIELDS
  );

  return {
    addressLine1: normalizeRequiredText(
      value.addressLine1,
      "mailingAddress.addressLine1",
      "Street address",
      150
    ),

    addressLine2: normalizeOptionalText(
      value.addressLine2,
      "mailingAddress.addressLine2",
      "Secondary address",
      100
    ),

    city: normalizeRequiredText(
      value.city,
      "mailingAddress.city",
      "City",
      100
    ),

    state: normalizeState(
      value.state,
      "mailingAddress.state",
      "Mailing state"
    ),

    zipCode: normalizeZipCode(value.zipCode)
  };
}

// Validate identification type.
function normalizeIdentificationType(value) {
  const normalized = normalizeRequiredText(
    value,
    "identityInformation.identificationType",
    "Identification type",
    30
  );

  if (!IDENTIFICATION_TYPES.has(normalized)) {
    throw new IntakeValidationError(
      "identityInformation.identificationType",
      "Please select a driver's license or state ID."
    );
  }

  return normalized;
}

// Validate identification number without losing leading zeros.
function normalizeIdentificationNumber(value) {
  const normalized = normalizeRequiredText(
    value,
    "identityInformation.identificationNumber",
    "Identification number",
    30
  );

  if (
    !/^[A-Za-z0-9 -]+$/.test(normalized) ||
    !/[A-Za-z0-9]/.test(normalized)
  ) {
    throw new IntakeValidationError(
      "identityInformation.identificationNumber",
      "Identification number contains invalid characters."
    );
  }

  return normalized;
}

// Validate formatted or unformatted SSN input.
function normalizeSsn(value) {
  const normalized = normalizeRequiredText(
    value,
    "identityInformation.ssn",
    "Social Security number",
    11
  );

  const validFormat =
    /^(?:[0-9]{9}|[0-9]{3}-[0-9]{2}-[0-9]{4})$/;

  if (!validFormat.test(normalized)) {
    throw new IntakeValidationError(
      "identityInformation.ssn",
      "Social Security number must contain nine digits."
    );
  }

  return normalized.replace(/-/g, "");
}

// Apply structural SSN restrictions to actual intake submissions.
function validateSubmissionSsn(value) {
  const normalized = normalizeSsn(value);

  const areaNumber = normalized.slice(0, 3);
  const groupNumber = normalized.slice(3, 5);
  const serialNumber = normalized.slice(5, 9);

  if (
    areaNumber === "000" ||
    areaNumber === "666" ||
    Number(areaNumber) >= 900 ||
    groupNumber === "00" ||
    serialNumber === "0000"
  ) {
    throw new IntakeValidationError(
      "identityInformation.ssn",
      "Please provide a valid Social Security number."
    );
  }

  return normalized;
}

// Validate complete identity information.
function validateIdentityInformation(value) {
  validateObject(
    value,
    "identityInformation",
    IDENTITY_INFORMATION_FIELDS
  );

  return {
    identificationType: normalizeIdentificationType(
      value.identificationType
    ),

    issuingState: normalizeState(
      value.issuingState,
      "identityInformation.issuingState",
      "Identification issuing state"
    ),

    identificationNumber: normalizeIdentificationNumber(
      value.identificationNumber
    ),

    ssn: normalizeSsn(value.ssn)
  };
}

// Require explicit boolean replacement instructions.
function validateReplacementFlag(value, field) {
  if (typeof value !== "boolean") {
    throw new IntakeValidationError(
      field,
      "Please provide a valid identifier replacement instruction."
    );
  }

  return value;
}

// Validate identifier preservation and replacement decisions.
// existingIdentity must come from a trusted backend database query.
function validateIdentitySubmission(
  value,
  existingIdentity = null
) {
  validateObject(
    value,
    "identityInformation",
    IDENTITY_SUBMISSION_FIELDS
  );

  const identificationType =
    normalizeIdentificationType(
      value.identificationType
    );

  const issuingState = normalizeState(
    value.issuingState,
    "identityInformation.issuingState",
    "Identification issuing state"
  );

  const replaceIdentificationNumber =
    validateReplacementFlag(
      value.replaceIdentificationNumber,
      "identityInformation.replaceIdentificationNumber"
    );

  const replaceSsn = validateReplacementFlag(
    value.replaceSsn,
    "identityInformation.replaceSsn"
  );

  const hasStoredIdentificationNumber = Boolean(
    existingIdentity?.encryptedIdentificationNumber
  );

  const hasStoredSsn = Boolean(
    existingIdentity?.encryptedSsn
  );

  const identificationMetadataChanged =
    hasStoredIdentificationNumber &&
    (
      existingIdentity.identificationType !==
        identificationType ||
      existingIdentity.issuingState !== issuingState
    );

  // Missing identifiers must be supplied.
  if (
    !hasStoredIdentificationNumber &&
    !replaceIdentificationNumber
  ) {
    throw new IntakeValidationError(
      "identityInformation.identificationNumber",
      "Please provide your identification number."
    );
  }

  if (!hasStoredSsn && !replaceSsn) {
    throw new IntakeValidationError(
      "identityInformation.ssn",
      "Please provide your Social Security number."
    );
  }

  // A changed identification type or issuing state
  // requires a replacement identification number.
  if (
    identificationMetadataChanged &&
    !replaceIdentificationNumber
  ) {
    throw new IntakeValidationError(
      "identityInformation.identificationNumber",
      "Please provide a new identification number when changing identification details."
    );
  }

  // Preservation requests must not contain replacement values.
  if (
    !replaceIdentificationNumber &&
    Object.prototype.hasOwnProperty.call(
      value,
      "identificationNumber"
    )
  ) {
    throw new IntakeValidationError(
      "identityInformation.identificationNumber",
      "Select identification number replacement before providing a new number."
    );
  }

  if (
    !replaceSsn &&
    Object.prototype.hasOwnProperty.call(
      value,
      "ssn"
    )
  ) {
    throw new IntakeValidationError(
      "identityInformation.ssn",
      "Select Social Security number replacement before providing a new number."
    );
  }

  const validated = {
    identificationType,
    issuingState,
    replaceIdentificationNumber,
    replaceSsn
  };

  if (replaceIdentificationNumber) {
    validated.identificationNumber =
      normalizeIdentificationNumber(
        value.identificationNumber
      );
  }

  if (replaceSsn) {
    validated.ssn = validateSubmissionSsn(
      value.ssn
    );
  }

  return validated;
}

// Validate the newly introduced intake fields.
function validateExpandedIntakeFields(
  mailingAddress,
  identityInformation
) {
  return {
    mailingAddress: validateMailingAddress(
      mailingAddress
    ),

    identityInformation: validateIdentityInformation(
      identityInformation
    )
  };
}

module.exports = {
  IntakeValidationError,
  validateMailingAddress,
  validateIdentityInformation,
  validateExpandedIntakeFields,
  validateSubmissionSsn,
  validateIdentitySubmission
};
