const {
  getDocumentCategory
} = require("../constants/documentCategories");

function buildRequiredDocumentChecklist(intake) {
  const checklist = new Map();

  function addCategory(key) {
    const category = getDocumentCategory(key);

    if (
      category &&
      !checklist.has(category.key)
    ) {
      checklist.set(
        category.key,
        category
      );
    }
  }

  addCategory("government_identification");
  addCategory("previous_tax_return");

  const employmentTypes =
    new Set(intake.employmentTypes || []);

  const incomeSources =
    new Set(intake.incomeSources || []);

  const familyInformation =
    new Set(intake.familyInformation || []);

  const businessInformation =
    new Set(intake.businessInformation || []);

  const servicesNeeded =
    new Set(intake.servicesNeeded || []);

  if (
    employmentTypes.has("W-2 Employee") ||
    incomeSources.has("W-2 Income")
  ) {
    addCategory("w2_forms");
  }

  if (
    employmentTypes.has(
      "Independent Contractor"
    ) ||
    incomeSources.has("1099 Income")
  ) {
    addCategory("1099_forms");
  }

  const hasBusinessActivity =
    employmentTypes.has("Self-Employed") ||
    incomeSources.has("Business Income") ||
    businessInformation.size > 0 ||
    servicesNeeded.has(
      "Business Tax Filing"
    ) ||
    servicesNeeded.has("Bookkeeping");

  if (hasBusinessActivity) {
    addCategory(
      "business_income_records"
    );

    addCategory(
      "business_expense_records"
    );
  }

  if (
    incomeSources.has("Rental Income")
  ) {
    addCategory("rental_income_records");
  }

  if (
    incomeSources.has("Investment Income")
  ) {
    addCategory("investment_statements");
  }

  if (
    incomeSources.has("Social Security")
  ) {
    addCategory(
      "social_security_statements"
    );
  }

  if (
    employmentTypes.has("Retired") ||
    incomeSources.has("Pension")
  ) {
    addCategory("pension_statements");
  }

  if (
    incomeSources.has("Cryptocurrency")
  ) {
    addCategory(
      "cryptocurrency_records"
    );
  }

  if (
    familyInformation.has("Dependents")
  ) {
    addCategory("dependent_information");
  }

  if (
    familyInformation.has(
      "Childcare Expenses"
    )
  ) {
    addCategory(
      "childcare_expense_records"
    );
  }

  if (
    familyInformation.has(
      "Education Expenses"
    )
  ) {
    addCategory(
      "education_expense_records"
    );
  }

  if (
    servicesNeeded.has("Payroll Support")
  ) {
    addCategory("payroll_records");
  }

  if (
    intake.clientInformation &&
    intake.clientInformation.filingStatus &&
    intake.clientInformation.filingStatus !==
      "Single"
  ) {
    addCategory("filing_status_support");
  }

  return Array.from(checklist.values());
}

module.exports = buildRequiredDocumentChecklist;
