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
