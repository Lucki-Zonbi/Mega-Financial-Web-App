"use strict";

const assert = require("node:assert/strict");

const Invoice = require("../models/Invoice");
const Receipt = require("../models/Receipt");

function findUniqueIndex(model, field) {
  return model.schema.indexes().some(
    ([fields, options]) =>
      fields[field] === 1 &&
      Object.keys(fields).length === 1 &&
      options.unique === true
  );
}

function run() {
  assert.equal(
    Receipt.schema.path("receiptNumber")
      .options.unique,
    true
  );

  console.log("PASS: Unique receipt number declared.");

  const invoiceIndex = Receipt.schema.indexes().find(
  ([fields, options]) =>
    fields.invoice === 1 &&
    Object.keys(fields).length === 1 &&
    options.unique === true &&
    options.partialFilterExpression?.invoice?.$type ===
      "objectId"
  );

  assert.ok(
    invoiceIndex,
    "Expected a partial unique index for invoice references."
  );

  assert.equal(
    Receipt.schema.path("invoice").isRequired,
    false
  );

  console.log(
    "PASS: Optional invoice with partial unique index declared."
  );

  assert.equal(
    findUniqueIndex(
      Receipt,
      "stripePaymentIntentId"
    ),
    true
  );

  console.log("PASS: Unique PaymentIntent index declared.");

  assert.equal(
    findUniqueIndex(
      Receipt,
      "stripeCheckoutSessionId"
    ),
    true
  );

  console.log("PASS: Unique Checkout Session index declared.");

  assert.equal(
    Invoice.schema.path("invoiceNumber")
      .options.unique,
    true
  );

  console.log("PASS: Unique invoice number declared.");

  console.log(
    "\nAll five index declaration checks passed."
  );
}

try {
  run();
} catch (error) {
  console.error("Index inspection failed:", error);
  process.exitCode = 1;
}
