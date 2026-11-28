
// Sprint 2S.3F - Tax Intake Privacy and Masking

const {
  decryptIntakeValue
} = require("./intakeEncryptionUtils");

// Convert Mongoose documents and subdocuments
// into plain JavaScript objects.
function toPlainObject(value) {
  if (!value || typeof value !== "object") {
    return null;
  }

  if (typeof value.toObject === "function") {
    return value.toObject();
  }

  return value;
}

// Mask a normalized nine-digit Social Security number.
function maskSsn(value) {
  if (
    typeof value !== "string" ||
    !/^[0-9]{9}$/.test(value)
  ) {
    throw new Error(
      "Unable to mask Social Security number."
    );
  }

  return `***-**-${value.slice(-4)}`;
}

// Mask an identification number without revealing
// the complete value, including short identifiers.
function maskIdentificationNumber(value) {
  if (
    typeof value !== "string" ||
    value.length < 1 ||
    value.length > 30 ||
    !/^[A-Za-z0-9 -]+$/.test(value) ||
    !/[A-Za-z0-9]/.test(value)
  ) {
    throw new Error(
      "Unable to mask identification number."
    );
  }

  // Remove formatting characters for masked display.
  const compact = value.replace(/[ -]/g, "");

  // Fully conceal identifiers containing four
  // or fewer alphanumeric characters.
  if (compact.length <= 4) {
    return "****";
  }

  // Reveal no more than the final four characters.
  return `****${compact.slice(-4)}`;
}

// Serialize only a valid MongoDB record identifier.
// Never return a populated user document.
function serializeRecordId(value) {
  let candidate = value;

  if (
    candidate &&
    typeof candidate === "object"
  ) {
    if (
      typeof candidate.toHexString === "function"
    ) {
      candidate = candidate.toHexString();
    } else {
      candidate = candidate._id;

      if (
        candidate &&
        typeof candidate.toHexString === "function"
      ) {
        candidate = candidate.toHexString();
      }
    }
  }

  if (
    typeof candidate !== "string" ||
    !/^[a-fA-F0-9]{24}$/.test(candidate)
  ) {
    return undefined;
  }

  return candidate.toLowerCase();
}


// Explicitly select approved client information fields.
function buildSafeClientInformation(value) {
  const information = toPlainObject(value);

  if (!information) {
    return null;
  }

  return {
    firstName: information.firstName,
    lastName: information.lastName,
    email: information.email,
    phone: information.phone,
    filingStatus: information.filingStatus
  };
}

// Explicitly select approved mailing address fields.
function buildSafeMailingAddress(value) {
  const address = toPlainObject(value);

  if (!address) {
    return null;
  }

  return {
    addressLine1: address.addressLine1,
    addressLine2: address.addressLine2 ?? "",
    city: address.city,
    state: address.state,
    zipCode: address.zipCode
  };
}

// Explicitly select non-sensitive identity metadata.
function buildSafeIdentityMetadata(value) {
  const identity = toPlainObject(value);

  if (!identity) {
    return null;
  }

  return {
    identificationType: identity.identificationType,
    issuingState: identity.issuingState
  };
}

// Build masked identity information for an already
// authorized Executive Administrator or PDF operation.
//
// Authorization must be enforced by the calling route.
function buildMaskedIdentityInformation(intake) {
  try {
    const record = toPlainObject(intake);

    if (!record) {
      throw new Error("Invalid intake record.");
    }

    const identity = toPlainObject(
      record.identityInformation
    );

    // Preserve compatibility with historical records.
    if (!identity) {
      return null;
    }

    const context = {
      clientId: String(record.user),
      taxYear: record.taxYear
    };

    const encryptedSsn = toPlainObject(
      identity.encryptedSsn
    );

    const encryptedIdentificationNumber =
      toPlainObject(
        identity.encryptedIdentificationNumber
      );

    // Never silently treat missing encrypted fields
    // as successfully retrieved sensitive information.
    if (
      !encryptedSsn ||
      !encryptedIdentificationNumber
    ) {
      throw new Error(
        "Encrypted identity information unavailable."
      );
    }

    const ssn = decryptIntakeValue(
      encryptedSsn,
      {
        ...context,
        field: "ssn"
      }
    );

    const identificationNumber = decryptIntakeValue(
      encryptedIdentificationNumber,
      {
        ...context,
        field: "identificationNumber"
      }
    );

    return {
      identificationType: identity.identificationType,
      issuingState: identity.issuingState,
      maskedIdentificationNumber:
        maskIdentificationNumber(
          identificationNumber
        ),
      maskedSsn: maskSsn(ssn)
    };
  } catch {
    throw new Error(
      "Unable to prepare masked identity information."
    );
  }
}

// Build an ordinary intake response using an explicit
// allowlist rather than returning the complete document.
//
// This function never decrypts sensitive information.
// Authentication and record ownership must be enforced
// by the calling route.
function buildSafeIntakeResponse(intake) {
  const record = toPlainObject(intake);

  if (!record) {
    throw new Error(
      "Unable to prepare tax intake response."
    );
  }

    return {
    _id: serializeRecordId(record._id),
    user: serializeRecordId(record.user),
    taxYear: record.taxYear,

    clientInformation:
      buildSafeClientInformation(
        record.clientInformation
      ),

    mailingAddress:
      buildSafeMailingAddress(
        record.mailingAddress
      ),

    identityInformation:
      buildSafeIdentityMetadata(
        record.identityInformation
      ),

    employmentTypes: record.employmentTypes ?? [],
    incomeSources: record.incomeSources ?? [],
    familyInformation: record.familyInformation ?? [],
    businessInformation:
      record.businessInformation ?? [],
    servicesNeeded: record.servicesNeeded ?? [],

    additionalNotes: record.additionalNotes ?? "",
    status: record.status,
    submittedAt: record.submittedAt,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt
  };
}

module.exports = {
  maskSsn,
  maskIdentificationNumber,
  buildMaskedIdentityInformation,
  buildSafeIntakeResponse
};
