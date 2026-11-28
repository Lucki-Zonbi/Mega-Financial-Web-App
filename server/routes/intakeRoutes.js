const express = require("express");
const protect = require("../middleware/authMiddleware");

const {
  requireClient
} = require("../middleware/roleAuthorizationMiddleware");

const TaxIntake = require("../models/TaxIntake");

const {
  buildSafeIntakeResponse
} = require("../utils/intakePrivacyUtils");

const {
  IntakeValidationError,
  validateMailingAddress,
  validateIdentitySubmission
} = require("../utils/intakeValidationUtils");

const {
  encryptIntakeValue,
  decryptIntakeValue
} = require("../utils/intakeEncryptionUtils");

const buildRequiredDocumentChecklist = require(
  "../utils/buildRequiredDocumentChecklist"
);

const router = express.Router();

// Prevent storage of private tax intake API responses.
router.use((req, res, next) => {
  res.setHeader(
    "Cache-Control",
    "private, no-store, max-age=0"
  );

  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");

  res.setHeader(
    "X-Content-Type-Options",
    "nosniff"
  );

  next();
});


const ALLOWED_EMPLOYMENT_TYPES = [
  "W-2 Employee",
  "Self-Employed",
  "Independent Contractor",
  "Retired"
];

const ALLOWED_INCOME_SOURCES = [
  "W-2 Income",
  "1099 Income",
  "Business Income",
  "Rental Income",
  "Investment Income",
  "Social Security",
  "Pension",
  "Cryptocurrency"
];

const ALLOWED_FAMILY_INFORMATION = [
  "Dependents",
  "Childcare Expenses",
  "Education Expenses"
];

const ALLOWED_BUSINESS_INFORMATION = [
  "Own a Business",
  "LLC",
  "Sole Proprietor",
  "Partnership",
  "Corporation"
];

const ALLOWED_SERVICES = [
  "Individual Tax Filing",
  "Business Tax Filing",
  "Bookkeeping",
  "Payroll Support",
  "Tax Planning"
];
// Convert Mongoose encrypted subdocuments into plain envelopes.
function toEncryptedEnvelope(value) {
  if (
    value &&
    typeof value.toObject === "function"
  ) {
    return value.toObject();
  }

  return value;
}

// Prepare encrypted identity information before database persistence.
function prepareEncryptedIdentity(
  validatedIdentity,
  existingIdentity,
  context
) {
  let encryptedIdentificationNumber;
  let encryptedSsn;

  const identificationContext = {
    ...context,
    field: "identificationNumber"
  };

  const ssnContext = {
    ...context,
    field: "ssn"
  };

  if (
    validatedIdentity.replaceIdentificationNumber
  ) {
    encryptedIdentificationNumber =
      encryptIntakeValue(
        validatedIdentity.identificationNumber,
        identificationContext
      );
  } else {
    encryptedIdentificationNumber =
      toEncryptedEnvelope(
        existingIdentity?.encryptedIdentificationNumber
      );

    // Authenticate the preserved envelope.
    decryptIntakeValue(
      encryptedIdentificationNumber,
      identificationContext
    );
  }

  if (validatedIdentity.replaceSsn) {
    encryptedSsn = encryptIntakeValue(
      validatedIdentity.ssn,
      ssnContext
    );
  } else {
    encryptedSsn = toEncryptedEnvelope(
      existingIdentity?.encryptedSsn
    );

    // Authenticate the preserved envelope.
    decryptIntakeValue(
      encryptedSsn,
      ssnContext
    );
  }

  return {
    identificationType:
      validatedIdentity.identificationType,

    issuingState:
      validatedIdentity.issuingState,

    encryptedIdentificationNumber,
    encryptedSsn
  };
}

function cleanString(value) {
  return String(value || "").trim();
}

function normalizeEmail(value) {
  return cleanString(value).toLowerCase();
}

function filterAllowedSelections(value, allowedValues) {
  if (!Array.isArray(value)) {
    return [];
  }

  return [
    ...new Set(
      value
        .map((item) => cleanString(item))
        .filter((item) => allowedValues.includes(item))
    )
  ];
}

router.get("/me", protect, requireClient, async (req, res) => {  try {
    const taxYear = Number(req.query.taxYear);

    const query = {
      user: req.user.id
    };

    if (Number.isInteger(taxYear)) {
      query.taxYear = taxYear;
    }

    const intake = await TaxIntake.findOne(query).sort({
      taxYear: -1,
      updatedAt: -1
    });

    if (!intake) {
      return res.status(404).json({
        success: false,
        message: "No tax intake record was found for this client."
      });
    }

    return res.status(200).json({
      success: true,
      message: "Tax intake retrieved successfully.",
      intake: buildSafeIntakeResponse(intake)
    });
  } catch (error) {
    console.error("Tax intake retrieval failed.");

    return res.status(500).json({
      success: false,
      message: "Something went wrong while retrieving the tax intake."
    });
  }
});

router.get("/checklist", protect, requireClient, async (req, res) => {
    try {
    const taxYear = Number(req.query.taxYear);

    const query = {
      user: req.user.id
    };

    if (Number.isInteger(taxYear)) {
      query.taxYear = taxYear;
    }

    const intake = await TaxIntake.findOne(query).sort({
      taxYear: -1,
      updatedAt: -1
    });

    if (!intake) {
      return res.status(404).json({
        success: false,
        message:
          "Complete your tax intake before viewing a personalized document checklist.",
        checklist: [],
        checklistCount: 0
      });
    }

    const checklist = buildRequiredDocumentChecklist(intake);

    return res.status(200).json({
      success: true,
      message: "Required document checklist generated successfully.",
      taxYear: intake.taxYear,
      intakeStatus: intake.status,
      checklistCount: checklist.length,
      checklist
    });
  } catch (error) {
    console.error("Document checklist generation failed.");

    return res.status(500).json({
      success: false,
      message:
        "Something went wrong while generating the document checklist."
    });
  }
});

router.post("/", protect, requireClient, async (req, res) => {
  try {
    const {
      taxYear,
      clientInformation,
      mailingAddress,
      identityInformation,
      employmentTypes,
      incomeSources,
      familyInformation,
      businessInformation,
      servicesNeeded,
      additionalNotes
    } = req.body;

    const parsedTaxYear = Number(taxYear);

    if (
      !Number.isInteger(parsedTaxYear) ||
      parsedTaxYear < 2000 ||
      parsedTaxYear > 2100
    ) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid tax year."
      });
    }

    if (!clientInformation || typeof clientInformation !== "object") {
      return res.status(400).json({
        success: false,
        message: "Please complete the required client information."
      });
    }

    const sanitizedClientInformation = {
      firstName: cleanString(clientInformation.firstName),
      lastName: cleanString(clientInformation.lastName),
      email: normalizeEmail(clientInformation.email),
      phone: cleanString(clientInformation.phone),
      filingStatus: cleanString(clientInformation.filingStatus)
    };

    const {
      firstName,
      lastName,
      email,
      phone,
      filingStatus
    } = sanitizedClientInformation;

    if (!firstName || !lastName || !email || !phone || !filingStatus) {
      return res.status(400).json({
        success: false,
        message: "Please complete all required client information fields."
      });
    }
    // Validate the expanded mailing address.
    const validatedMailingAddress =
      validateMailingAddress(mailingAddress);

    // Retrieve existing identity information for the
    // authenticated client and selected tax year only.
    const existingIntake = await TaxIntake.findOne({
      user: req.user.id,
      taxYear: parsedTaxYear
    })
      .select(
        "_id updatedAt identityInformation " +
        "+identityInformation.encryptedIdentificationNumber " +
        "+identityInformation.encryptedSsn"
      )
      .lean();

    const existingIdentity =
      existingIntake?.identityInformation || null;

    // Validate explicit preservation and replacement decisions.
    const validatedIdentity =
      validateIdentitySubmission(
        identityInformation,
        existingIdentity
      );

    // Derive encryption context from authenticated information.
    const encryptionContext = {
      clientId: String(req.user.id),
      taxYear: parsedTaxYear
    };

    // Complete encryption and preserved-envelope authentication
    // before attempting a database update.
    const encryptedIdentity =
      prepareEncryptedIdentity(
        validatedIdentity,
        existingIdentity,
        encryptionContext
      );

    const intakeData = {
      clientInformation: sanitizedClientInformation,

      mailingAddress: validatedMailingAddress,

      identityInformation: encryptedIdentity,

      employmentTypes: filterAllowedSelections(
        employmentTypes,
        ALLOWED_EMPLOYMENT_TYPES
      ),

      incomeSources: filterAllowedSelections(
        incomeSources,
        ALLOWED_INCOME_SOURCES
      ),

      familyInformation: filterAllowedSelections(
        familyInformation,
        ALLOWED_FAMILY_INFORMATION
      ),

      businessInformation: filterAllowedSelections(
        businessInformation,
        ALLOWED_BUSINESS_INFORMATION
      ),

      servicesNeeded: filterAllowedSelections(
        servicesNeeded,
        ALLOWED_SERVICES
      ),

      additionalNotes: cleanString(additionalNotes),
      status: "submitted",
      submittedAt: new Date()
    };

    let intake;

    if (existingIntake) {
      // Update only if the record still matches the
      // identity information retrieved for this submission.
      const updateFilter = {
        _id: existingIntake._id,
        user: req.user.id,
        taxYear: parsedTaxYear,
        updatedAt: existingIntake.updatedAt
      };

      // Compare the previous identity snapshot as well,
      // rather than relying on timestamps alone.
      if (existingIdentity) {
        updateFilter.identityInformation =
          existingIdentity;
      } else {
        updateFilter.identityInformation = {
          $exists: false
        };
      }

      intake = await TaxIntake.findOneAndUpdate(
        updateFilter,
        {
          $set: intakeData
        },
        {
          new: true,
          upsert: false,
          runValidators: true
        }
      );

      if (!intake) {
        return res.status(409).json({
          success: false,
          message:
            "Your tax intake has changed. Please reload the form and try again."
        });
      }
    } else {
      // Create a new intake only after validation
      // and encryption operations have succeeded.
      intake = await TaxIntake.create({
        user: req.user.id,
        taxYear: parsedTaxYear,
        ...intakeData
      });
    }

    return res.status(200).json({
      success: true,
      message: "Tax intake saved successfully.",
      intake: buildSafeIntakeResponse(intake)
    });
  } catch (error) {
    console.error("Tax intake submission failed.");

        if (error instanceof IntakeValidationError) {
      return res.status(400).json({
        success: false,
        message: error.message,
        field: error.field
      });
    }

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message:
          "A tax intake already exists for this tax year. Please reload the form and try again."
      });
    }

        if (error.name === "ValidationError") {
      return res.status(400).json({
        success: false,
        message:
          "The submitted tax intake contains invalid information."
      });
    }

    return res.status(500).json({
      success: false,
      message: "Something went wrong while saving the tax intake."
    });
  }
});

module.exports = router;
