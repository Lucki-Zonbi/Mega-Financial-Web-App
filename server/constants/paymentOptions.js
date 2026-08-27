const PAYMENT_SERVICE_OPTIONS = Object.freeze({
  individual_tax_filing: Object.freeze({
    serviceName: "Individual Tax Filing",
    stripePriceEnv: "STRIPE_PRICE_INDIVIDUAL_TAX_FILING"
  }),

  business_tax_filing: Object.freeze({
    serviceName: "Business Tax Filing",
    stripePriceEnv: "STRIPE_PRICE_BUSINESS_TAX_FILING"
  }),

  bookkeeping: Object.freeze({
    serviceName: "Bookkeeping",
    stripePriceEnv: "STRIPE_PRICE_BOOKKEEPING"
  }),

  payroll_support: Object.freeze({
    serviceName: "Payroll Support",
    stripePriceEnv: "STRIPE_PRICE_PAYROLL_SUPPORT"
  }),

  tax_planning: Object.freeze({
    serviceName: "Tax Planning",
    stripePriceEnv: "STRIPE_PRICE_TAX_PLANNING"
  })
});

function getPaymentServiceOption(serviceKey) {
  return PAYMENT_SERVICE_OPTIONS[serviceKey] || null;
}

function getStripePriceId(serviceKey) {
  const option =
    getPaymentServiceOption(
      serviceKey
    );

  if (!option) {
    return "";
  }

  return String(
    process.env[
      option.stripePriceEnv
    ] || ""
  ).trim();
}

function getConfiguredPaymentServices() {
  return Object.entries(
    PAYMENT_SERVICE_OPTIONS
  )
    .filter(([serviceKey]) => {
      return Boolean(
        getStripePriceId(
          serviceKey
        )
      );
    })
    .map(
      ([serviceKey, option]) => ({
        serviceKey,
        serviceName:
          option.serviceName
      })
    );
}

module.exports = {
  PAYMENT_SERVICE_OPTIONS,
  getPaymentServiceOption,
  getStripePriceId,
  getConfiguredPaymentServices
};
