const mongoose = require("mongoose");

const FILING_STATUSES = [
  "Single",
  "Married Filing Jointly",
  "Married Filing Separately",
  "Head of Household",
  "Qualifying Surviving Spouse"
];

const EMPLOYMENT_TYPES = [
  "W-2 Employee",
  "Self-Employed",
  "Independent Contractor",
  "Retired"
];

const INCOME_SOURCES = [
  "W-2 Income",
  "1099 Income",
  "Business Income",
  "Rental Income",
  "Investment Income",
  "Social Security",
  "Pension",
  "Cryptocurrency"
];

const FAMILY_INFORMATION_OPTIONS = [
  "Dependents",
  "Childcare Expenses",
  "Education Expenses"
];

const BUSINESS_INFORMATION_OPTIONS = [
  "Own a Business",
  "LLC",
  "Sole Proprietor",
  "Partnership",
  "Corporation"
];

const TAX_SERVICE_OPTIONS = [
  "Individual Tax Filing",
  "Business Tax Filing",
  "Bookkeeping",
  "Payroll Support",
  "Tax Planning"
];

const US_STATE_CODES = [
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
];

const IDENTIFICATION_TYPES = [
  "drivers_license",
  "state_id"
];

const clientInformationSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100
    },

    lastName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100
    },

    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      maxlength: 254
    },

    phone: {
      type: String,
      required: true,
      trim: true,
      maxlength: 30
    },

    filingStatus: {
      type: String,
      required: true,
      enum: FILING_STATUSES
    }
  },
  {
    _id: false
  }
);

const mailingAddressSchema = new mongoose.Schema(
  {
    addressLine1: {
      type: String,
      required: true,
      trim: true,
      maxlength: 150
    },

    addressLine2: {
      type: String,
      trim: true,
      maxlength: 100,
      default: ""
    },

    city: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100
    },

    state: {
      type: String,
      required: true,
      enum: US_STATE_CODES
    },

    zipCode: {
      type: String,
      required: true,
      trim: true,
      match: /^[0-9]{5}(-[0-9]{4})?$/
    }
  },
  {
    _id: false,
    strict: "throw"
  }
);


function isCanonicalBase64(
  value,
  expectedLength,
  maximumLength
) {
  if (
    typeof value !== "string" ||
    !value.length
  ) {
    return false;
  }

  const decoded = Buffer.from(value, "base64");

  if (
    decoded.toString("base64") !== value
  ) {
    return false;
  }

  if (
    expectedLength !== undefined &&
    decoded.length !== expectedLength
  ) {
    return false;
  }

  if (
    maximumLength !== undefined &&
    decoded.length > maximumLength
  ) {
    return false;
  }

  return decoded.length > 0;
}

const encryptedIntakeValueSchema =
  new mongoose.Schema(
    {
      version: {
        type: Number,
        required: true,
        enum: [1]
      },

      keyId: {
        type: String,
        required: true,
        match: /^[a-zA-Z0-9_-]{1,64}$/
      },

      iv: {
        type: String,
        required: true,
        maxlength: 16,
        validate: {
          validator: (value) =>
            isCanonicalBase64(value, 12),
          message: "Invalid encryption IV."
        }
      },

      authTag: {
        type: String,
        required: true,
        maxlength: 24,
        validate: {
          validator: (value) =>
            isCanonicalBase64(value, 16),
          message: "Invalid authentication tag."
        }
      },

      ciphertext: {
        type: String,
        required: true,
        maxlength: 344,
        validate: {
          validator: (value) =>
            isCanonicalBase64(
              value,
              undefined,
              256
            ),
          message: "Invalid encrypted value."
        }
      }
    },
    {
      _id: false,
      strict: "throw"
    }
  );

const identityInformationSchema =
  new mongoose.Schema(
    {
      identificationType: {
        type: String,
        required: true,
        enum: IDENTIFICATION_TYPES
      },

      issuingState: {
        type: String,
        required: true,
        enum: US_STATE_CODES
      },

      encryptedIdentificationNumber: {
        type: encryptedIntakeValueSchema,
        required: true,
        select: false
      },

      encryptedSsn: {
        type: encryptedIntakeValueSchema,
        required: true,
        select: false
      }
    },
    {
      _id: false,
      strict: "throw"
    }
  );

const taxIntakeSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      immutable: true,
      index: true
    },

    taxYear: {
      type: Number,
      required: true,
      min: 2000,
      max: 2100
    },


    clientInformation: {
      type: clientInformationSchema,
      required: true
    },

    mailingAddress: {
      type: mailingAddressSchema,
      default: undefined
    },

    identityInformation: {
      type: identityInformationSchema,
      default: undefined
    },

    employmentTypes: [

      {
        type: String,
        enum: EMPLOYMENT_TYPES
      }
    ],

    incomeSources: [
      {
        type: String,
        enum: INCOME_SOURCES
      }
    ],

    familyInformation: [
      {
        type: String,
        enum: FAMILY_INFORMATION_OPTIONS
      }
    ],

    businessInformation: [
      {
        type: String,
        enum: BUSINESS_INFORMATION_OPTIONS
      }
    ],

    servicesNeeded: [
      {
        type: String,
        enum: TAX_SERVICE_OPTIONS
      }
    ],

    additionalNotes: {
      type: String,
      trim: true,
      maxlength: 3000,
      default: ""
    },

    status: {
      type: String,
      enum: ["submitted", "under_review", "completed"],
      default: "submitted"
    },

    submittedAt: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true
  }
);

taxIntakeSchema.index(
  {
    user: 1,
    taxYear: 1
  },
  {
    unique: true
  }
);

module.exports = mongoose.model("TaxIntake", taxIntakeSchema);
