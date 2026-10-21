"use strict";

const assert = require("node:assert/strict");
const mongoose = require("mongoose");

const Receipt = require("../models/Receipt");

async function run() {
  const validReceipt = {
    receiptNumber: "TEST-RECEIPT-001",
    invoice: new mongoose.Types.ObjectId(),
    client: new mongoose.Types.ObjectId(),
    amountPaidCents: 15000,
    currency: "usd",
    paymentConfirmedAt: new Date(
      Date.now() - 60000
    ),
    stripePaymentIntentId: "pi_Phase2Test123",
  };

  // Test 1 — Valid receipt structure
  const receipt = new Receipt(validReceipt);

  await receipt.validate();

  console.log("PASS: Valid receipt structure.");

  // Test 2 — Negative payment amount
  const negativeReceipt = new Receipt({
    ...validReceipt,
    amountPaidCents: -100
  });

  await assert.rejects(
    negativeReceipt.validate()
  );

  console.log("PASS: Negative amount rejected.");

  // Test 3 — Fractional payment amount
  const fractionalReceipt = new Receipt({
    ...validReceipt,
    amountPaidCents: 100.5
  });

  await assert.rejects(
    fractionalReceipt.validate()
  );

  console.log("PASS: Fractional amount rejected.");

  // Test 4 — Unsupported currency
  const invalidCurrencyReceipt = new Receipt({
    ...validReceipt,
    currency: "eur"
  });

  await assert.rejects(
    invalidCurrencyReceipt.validate()
  );

  console.log("PASS: Unsupported currency rejected.");

  // Test 5 — Calendly payment without internal invoice
  const calendlyReceipt = new Receipt({
    ...validReceipt,
    invoice: undefined
  });

  await calendlyReceipt.validate();

  assert.equal(calendlyReceipt.invoice, undefined);

  console.log(
    "PASS: Receipt without internal invoice accepted."
  );

  // Test 6 — Future payment confirmation
  const futureReceipt = new Receipt({
    ...validReceipt,
    paymentConfirmedAt: new Date(
      Date.now() + 86400000
    )
  });

  await assert.rejects(
    futureReceipt.validate()
  );

  console.log("PASS: Future confirmation rejected.");

  // Test 7 — PDF timestamp without storage key
  const invalidPdfReceipt = new Receipt({
    ...validReceipt,
    pdfGeneratedAt: new Date()
  });

  await assert.rejects(
    invalidPdfReceipt.validate()
  );

  console.log("PASS: Missing PDF storage key rejected.");

  // Test 8 — Missing payment confirmation
  const missingConfirmationReceipt = new Receipt({
    ...validReceipt,
    paymentConfirmedAt: undefined
  });

  await assert.rejects(
    missingConfirmationReceipt.validate()
  );

  console.log("PASS: Missing confirmation rejected.");

  // Test 9 — Missing Stripe payment reference
  const missingStripeReference = new Receipt({
    ...validReceipt,
    stripePaymentIntentId: undefined,
    stripeCheckoutSessionId: undefined
  });

  await assert.rejects(
    missingStripeReference.validate(),
    (error) =>
      error.name === "ValidationError" &&
      Boolean(error.errors.stripePaymentIntentId)
  );

  console.log("PASS: Missing Stripe reference rejected.");

  // Test 10 — Invalid PaymentIntent identifier
  const invalidPaymentIntent = new Receipt({
    ...validReceipt,
    stripePaymentIntentId: "invalid-payment-reference"
  });

  await assert.rejects(
    invalidPaymentIntent.validate(),
    (error) =>
      error.name === "ValidationError" &&
      Boolean(error.errors.stripePaymentIntentId)
  );

  console.log("PASS: Invalid PaymentIntent ID rejected.");

  // Test 11 — Valid Checkout Session identifier
  const checkoutReceipt = new Receipt({
    ...validReceipt,
    stripePaymentIntentId: undefined,
    stripeCheckoutSessionId: "cs_test_Phase2Test123",
    invoice: undefined
  });

  await checkoutReceipt.validate();

  console.log("PASS: Valid Checkout Session ID accepted.");

  // Test 12 — Missing client association
  const missingClientReceipt = new Receipt({
    ...validReceipt,
    client: undefined
  });

  await assert.rejects(
    missingClientReceipt.validate(),
    (error) =>
      error.name === "ValidationError" &&
      Boolean(error.errors.client)
  );

  console.log("PASS: Missing client association rejected.");

  console.log(
    "\nAll twelve Receipt model validation tests passed."
  );
}

run()
  .catch((error) => {
    console.error("Receipt validation failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
