const DOCUMENT_CATEGORIES = Object.freeze({
  government_identification: Object.freeze({
    key: "government_identification",
    title: "Government-issued identification",
    description:
      "Provide a current photo ID for each taxpayer included on the return."
  }),

  previous_tax_return: Object.freeze({
    key: "previous_tax_return",
    title: "Previous tax return",
    description:
      "Provide your most recently filed federal and state tax returns when available."
  }),

  w2_forms: Object.freeze({
    key: "w2_forms",
    title: "W-2 forms",
    description:
      "Provide every W-2 received from employers for the 2026 tax year."
  }),

  forms_1099: Object.freeze({
    key: "1099_forms",
    title: "1099 forms",
    description:
      "Provide all applicable 1099 forms, including contractor and other income statements."
  }),

  business_income_records: Object.freeze({
    key: "business_income_records",
    title: "Business income records",
    description:
      "Provide sales summaries, invoices, deposits, and other records supporting business income."
  }),

  business_expense_records: Object.freeze({
    key: "business_expense_records",
    title: "Business expense records",
    description:
      "Provide categorized receipts, statements, mileage records, and other deductible expense records."
  }),

  rental_income_records: Object.freeze({
    key: "rental_income_records",
    title: "Rental income records",
    description:
      "Provide rent received, property expenses, mortgage interest, taxes, and improvement records."
  }),

  investment_statements: Object.freeze({
    key: "investment_statements",
    title: "Investment statements",
    description:
      "Provide brokerage tax statements and records for investment sales, dividends, and interest."
  }),

  social_security_statements: Object.freeze({
    key: "social_security_statements",
    title: "Social Security statements",
    description:
      "Provide Form SSA-1099 or other Social Security benefit statements."
  }),

  pension_statements: Object.freeze({
    key: "pension_statements",
    title: "Pension and retirement statements",
    description:
      "Provide Forms 1099-R and other pension or retirement distribution statements."
  }),

  cryptocurrency_records: Object.freeze({
    key: "cryptocurrency_records",
    title: "Cryptocurrency transaction records",
    description:
      "Provide exchange statements and complete transaction histories showing purchases, sales, swaps, and income."
  }),

  dependent_information: Object.freeze({
    key: "dependent_information",
    title: "Dependent information",
    description:
      "Provide each dependent’s legal name, date of birth, relationship, and supporting eligibility records."
  }),

  childcare_expense_records: Object.freeze({
    key: "childcare_expense_records",
    title: "Childcare expense records",
    description:
      "Provide childcare provider details, tax identification information, and amounts paid."
  }),

  education_expense_records: Object.freeze({
    key: "education_expense_records",
    title: "Education expense records",
    description:
      "Provide Forms 1098-T, tuition statements, scholarship records, and qualified education expense receipts."
  }),

  payroll_records: Object.freeze({
    key: "payroll_records",
    title: "Payroll records",
    description:
      "Provide payroll summaries, payroll tax filings, employee wage records, and related notices."
  }),

  filing_status_support: Object.freeze({
    key: "filing_status_support",
    title: "Filing-status supporting records",
    description:
      "Provide spouse information or household-support records relevant to the selected filing status."
  })
});

const ALLOWED_DOCUMENT_CATEGORY_KEYS = Object.freeze(
  Object.values(DOCUMENT_CATEGORIES).map((category) => category.key)
);

function getDocumentCategory(key) {
  return Object.values(DOCUMENT_CATEGORIES).find(
    (category) => category.key === key
  );
}

module.exports = {
  DOCUMENT_CATEGORIES,
  ALLOWED_DOCUMENT_CATEGORY_KEYS,
  getDocumentCategory
};
