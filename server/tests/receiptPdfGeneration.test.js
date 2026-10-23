
"use strict";

const assert = require("node:assert/strict");

const {
  generateReceiptPdf,
  validateReceiptData,
  formatAmount,
  formatDate
} = require("../utils/generateReceiptPdf");

const validReceipt = {
  receiptNumber: "MF-TEST-0001",
  clientName: "Example Client",
  amountPaidCents: 12500,
  currency: "usd",
  paymentConfirmedAt: "2026-10-20T15:00:00.000Z",
  serviceDescription: "Tax Consultation"
};

async function run() {
  let passed = 0;

  // Test 1 — Valid PDF buffer
  const pdf = await generateReceiptPdf(validReceipt, {
    testMode: true
  });

  assert.ok(Buffer.isBuffer(pdf));
  assert.equal(pdf.subarray(0, 5).toString("ascii"), "%PDF-");
  assert.ok(pdf.length > 500);

  console.log("PASS 1: Valid PDF buffer generated.");
  passed++;

  // Test 2 — Currency formatting
  assert.equal(formatAmount(12500), "$125.00");
  assert.equal(formatAmount(1099), "$10.99");
  assert.equal(formatAmount(1), "$0.01");

  console.log("PASS 2: Currency formatting correct.");
  passed++;

  // Test 3 — Optional invoice
  const withoutInvoice = validateReceiptData(validReceipt);

  assert.equal(withoutInvoice.invoiceNumber, null);

  const pdfWithoutInvoice = await generateReceiptPdf(
    validReceipt,
    { testMode: true }
  );

  assert.ok(Buffer.isBuffer(pdfWithoutInvoice));

  console.log("PASS 3: Receipt without invoice accepted.");
  passed++;

    // Test 4 — Invalid payment amount
  assert.throws(
    () => generateReceiptPdf({
      ...validReceipt,
      amountPaidCents: -100
    }),
    /Invalid receipt payment amount/
  );

  console.log("PASS 4: Invalid amount rejected.");
  passed++;

  // Test 5 — Unsupported currency
  assert.throws(
    () => generateReceiptPdf({
      ...validReceipt,
      currency: "eur"
    }),
    /Only USD receipts are supported/
  );

  console.log("PASS 5: Unsupported currency rejected.");
  passed++;

  // Test 6 — Missing receipt number
  assert.throws(
    () => generateReceiptPdf({
      ...validReceipt,
      receiptNumber: ""
    }),
    /Invalid receipt field: receiptNumber/
  );

  console.log("PASS 6: Missing receipt number rejected.");
  passed++;

  // Test 7 — Invalid date
  assert.throws(
    () => generateReceiptPdf({
      ...validReceipt,
      paymentConfirmedAt: "invalid-date"
    }),
    /Invalid payment confirmation date/
  );

  console.log("PASS 7: Invalid date rejected.");
  passed++;

  // Test 8 — Sensitive data exclusion
  const sensitiveReceipt = {
    ...validReceipt,
    stripeSecretKey: "sk_test_DO_NOT_INCLUDE",
    jwtToken: "JWT_DO_NOT_INCLUDE",
    awsStorageKey: "PRIVATE_AWS_KEY_DO_NOT_INCLUDE"
  };

  const safePdf = await generateReceiptPdf(
    sensitiveReceipt,
    { testMode: true }
  );

  // PDFKit may compress PDF content, so byte-level scanning
  // alone is not a complete content verification.
  const rawPdf = safePdf.toString("latin1");

  assert.ok(!rawPdf.includes("sk_test_DO_NOT_INCLUDE"));
  assert.ok(!rawPdf.includes("JWT_DO_NOT_INCLUDE"));
  assert.ok(!rawPdf.includes("PRIVATE_AWS_KEY_DO_NOT_INCLUDE"));

  const validated = validateReceiptData(sensitiveReceipt);

  assert.ok(!Object.hasOwn(validated, "stripeSecretKey"));
  assert.ok(!Object.hasOwn(validated, "jwtToken"));
  assert.ok(!Object.hasOwn(validated, "awsStorageKey"));

  console.log("PASS 8: Sensitive fields excluded from validated input.");
  passed++;

  // Test 9 — Date formatting
  assert.equal(
    formatDate(new Date("2026-10-20T15:00:00.000Z")),
    "October 20, 2026"
  );

  console.log("PASS 9: Payment date formatting correct.");
  passed++;

    // Test 10 — Extracted PDF text excludes sensitive values
  const { PDFParse } = require("pdf-parse");

  const parser = new PDFParse({ data: safePdf });

  try {
    const result = await parser.getText();
    const pdfText = result.text;

    assert.ok(pdfText.includes("MEGA FINANCIAL"));
    assert.ok(pdfText.includes("MF-TEST-0001"));
    assert.ok(pdfText.includes("$125.00"));
    assert.ok(pdfText.includes("TEST DOCUMENT - NOT PROOF OF PAYMENT"));

    assert.ok(!pdfText.includes("sk_test_DO_NOT_INCLUDE"));
    assert.ok(!pdfText.includes("JWT_DO_NOT_INCLUDE"));
    assert.ok(!pdfText.includes("PRIVATE_AWS_KEY_DO_NOT_INCLUDE"));

    console.log("PASS 10: Extracted PDF text verified.");
    passed++;
  } finally {
    await parser.destroy();
  }

  console.log(`\n${passed}/10 receipt PDF tests passed.`);
}

run().catch(error => {
  console.error("FAIL:", error);
  process.exitCode = 1;
});
