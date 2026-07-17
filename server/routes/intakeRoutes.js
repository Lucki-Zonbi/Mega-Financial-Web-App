const express = require("express");
const protect = require("../middleware/authMiddleware");
const TaxIntake = require("../models/TaxIntake");

const router = express.Router();

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

function buildRequiredDocumentChecklist(intake) {
  const checklist = new Map();

  function addItem(key, title, description) {
    if (!checklist.has(key)) {
      checklist.set(key, { key, title, description });
    }
  }

  addItem(
    "government_identification",
    "Government-issued identification",
    "Provide a current photo ID for each taxpayer included on the return."
  );

  addItem(
    "previous_tax_return",
    "Previous tax return",
    "Provide your most recently filed federal and state tax returns when available."
  );

  const employmentTypes = new Set(intake.employmentTypes || []);
  const incomeSources = new Set(intake.incomeSources || []);
  const familyInformation = new Set(intake.familyInformation || []);
  const businessInformation = new Set(intake.businessInformation || []);
  const servicesNeeded = new Set(intake.servicesNeeded || []);

  if (employmentTypes.has("W-2 Employee") || incomeSources.has("W-2 Income")) {
    addItem(
      "w2_forms",
      "W-2 forms",
      "Provide every W-2 received from employers for the 2026 tax year."
    );
  }

  if (
    employmentTypes.has("Independent Contractor") ||
    incomeSources.has("1099 Income")
  ) {
    addItem(
      "1099_forms",
      "1099 forms",
      "Provide all applicable 1099 forms, including contractor and other income statements."
    );
  }

  const hasBusinessActivity =
    employmentTypes.has("Self-Employed") ||
    incomeSources.has("Business Income") ||
    businessInformation.size > 0 ||
    servicesNeeded.has("Business Tax Filing") ||
    servicesNeeded.has("Bookkeeping");

  if (hasBusinessActivity) {
    addItem(
      "business_income_records",
      "Business income records",
      "Provide sales summaries, invoices, deposits, and other records supporting business income."
    );

    addItem(
      "business_expense_records",
      "Business expense records",
      "Provide categorized receipts, statements, mileage records, and other deductible expense records."
    );
  }

  if (incomeSources.has("Rental Income")) {
    addItem(
      "rental_income_records",
      "Rental income records",
      "Provide rent received, property expenses, mortgage interest, taxes, and improvement records."
    );
  }

  if (incomeSources.has("Investment Income")) {
    addItem(
      "investment_statements",
      "Investment statements",
      "Provide brokerage tax statements and records for investment sales, dividends, and interest."
    );
  }

  if (incomeSources.has("Social Security")) {
    addItem(
      "social_security_statements",
      "Social Security statements",
      "Provide Form SSA-1099 or other Social Security benefit statements."
    );
  }

  if (employmentTypes.has("Retired") || incomeSources.has("Pension")) {
    addItem(
      "pension_statements",
      "Pension and retirement statements",
      "Provide Forms 1099-R and other pension or retirement distribution statements."
    );
  }

  if (incomeSources.has("Cryptocurrency")) {
    addItem(
      "cryptocurrency_records",
      "Cryptocurrency transaction records",
      "Provide exchange statements and complete transaction histories showing purchases, sales, swaps, and income."
    );
  }

  if (familyInformation.has("Dependents")) {
    addItem(
      "dependent_information",
      "Dependent information",
      "Provide each dependent’s legal name, date of birth, relationship, and supporting eligibility records."
    );
  }

  if (familyInformation.has("Childcare Expenses")) {
    addItem(
      "childcare_expense_records",
      "Childcare expense records",
      "Provide childcare provider details, tax identification information, and amounts paid."
    );
  }

  if (familyInformation.has("Education Expenses")) {
    addItem(
      "education_expense_records",
      "Education expense records",
      "Provide Forms 1098-T, tuition statements, scholarship records, and qualified education expense receipts."
    );
  }

  if (servicesNeeded.has("Payroll Support")) {
    addItem(
      "payroll_records",
      "Payroll records",
      "Provide payroll summaries, payroll tax filings, employee wage records, and related notices."
    );
  }

  if (
    intake.clientInformation &&
    intake.clientInformation.filingStatus &&
    intake.clientInformation.filingStatus !== "Single"
  ) {
    addItem(
      "filing_status_support",
      "Filing-status supporting records",
      "Provide spouse information or household-support records relevant to the selected filing status."
    );
  }

  return Array.from(checklist.values());
}

function clientRoleRequired(req, res, next) {
  if (req.user.role !== "client") {
    return res.status(403).json({
      success: false,
      message: "This intake route is available only to client accounts."
    });
  }

  next();
}

router.get("/me", protect, clientRoleRequired, async (req, res) => {
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
        message: "No tax intake record was found for this client."
      });
    }

    return res.status(200).json({
      success: true,
      message: "Tax intake retrieved successfully.",
      intake
    });
  } catch (error) {
    console.error("Tax intake retrieval error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Something went wrong while retrieving the tax intake."
    });
  }
});

router.get("/checklist", protect, clientRoleRequired, async (req, res) => {
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
    console.error("Document checklist generation error:", error.message);

    return res.status(500).json({
      success: false,
      message:
        "Something went wrong while generating the document checklist."
    });
  }
});

router.post("/", protect, clientRoleRequired, async (req, res) => {  try {
    const {
      taxYear,
      clientInformation,
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

    const intakeData = {
      clientInformation: sanitizedClientInformation,

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

    const intake = await TaxIntake.findOneAndUpdate(
      {
        user: req.user.id,
        taxYear: parsedTaxYear
      },
      {
        $set: intakeData,
        $setOnInsert: {
          user: req.user.id,
          taxYear: parsedTaxYear
        }
      },
      {
        new: true,
        upsert: true,
        runValidators: true,
        setDefaultsOnInsert: true
      }
    );

    return res.status(200).json({
      success: true,
      message: "Tax intake saved successfully.",
      intake
    });
  } catch (error) {
    console.error("Tax intake submission error:", error.message);

    if (error.name === "ValidationError") {
      return res.status(400).json({
        success: false,
        message: "One or more tax intake fields contain invalid information."
      });
    }

    return res.status(500).json({
      success: false,
      message: "Something went wrong while saving the tax intake."
    });
  }
});

module.exports = router;
