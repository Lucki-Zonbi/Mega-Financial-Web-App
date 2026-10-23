
"use strict";

const PDFDocument = require("pdfkit");

const MAX_TEXT_LENGTH = 150;

function requireText(value, field, maxLength = MAX_TEXT_LENGTH) {
  if (
    typeof value !== "string" ||
    !value.trim() ||
    value.trim().length > maxLength ||
    /[\x00-\x1F\x7F]/.test(value)
  ) {
    throw new Error(`Invalid receipt field: ${field}.`);
  }

  return value.trim();
}

function optionalText(value, field) {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  return requireText(value, field);
}

function validateReceiptData(data) {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new Error("Receipt data must be an object.");
  }

  const receiptNumber = requireText(
    data.receiptNumber,
    "receiptNumber",
    100
  );

  const clientName = requireText(
    data.clientName,
    "clientName"
  );

  if (
    !Number.isSafeInteger(data.amountPaidCents) ||
    data.amountPaidCents < 1 ||
    data.amountPaidCents > 100000000
  ) {
    throw new Error("Invalid receipt payment amount.");
  }

  if (data.currency !== "usd") {
    throw new Error("Only USD receipts are supported.");
  }

  const date = new Date(data.paymentConfirmedAt);

  if (
    !data.paymentConfirmedAt ||
    !Number.isFinite(date.getTime()) ||
    date.getTime() > Date.now()
  ) {
    throw new Error("Invalid payment confirmation date.");
  }

  return {
    receiptNumber,
    clientName,
    amountPaidCents: data.amountPaidCents,
    currency: "USD",
    paymentConfirmedAt: date,
    serviceDescription: optionalText(
      data.serviceDescription,
      "serviceDescription"
    ),
    invoiceNumber: optionalText(
      data.invoiceNumber,
      "invoiceNumber"
    )
  };
}

function formatAmount(amountPaidCents) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD"
  }).format(amountPaidCents / 100);
}

function formatDate(date) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    year: "numeric",
    month: "long",
    day: "numeric"
  }).format(date);
}

function generateReceiptPdf(receiptData, options = {}) {
  // Validate before beginning PDF generation.
  const receipt = validateReceiptData(receiptData);
  const testMode = options.testMode === true;

  return new Promise((resolve, reject) => {
    const document = new PDFDocument({
      size: "LETTER",
      margin: 50,
      info: {
        Title: testMode
          ? "Mega Financial Test Receipt"
          : "Mega Financial Payment Receipt",
        Author: "Mega Financial",
        Subject: "Payment receipt"
      }
    });

    const chunks = [];

    document.on("data", chunk => chunks.push(chunk));
    document.on("error", reject);

    document.on("end", () => {
      const buffer = Buffer.concat(chunks);

      if (
        buffer.length < 5 ||
        buffer.subarray(0, 5).toString("ascii") !== "%PDF-"
      ) {
        reject(new Error("PDF generation failed."));
        return;
      }

      resolve(buffer);
    });

    try {
      const blue = "#17649A";
      const green = "#27866D";
      const dark = "#263745";

      document
        .font("Helvetica-Bold")
        .fontSize(23)
        .fillColor(blue)
        .text("MEGA FINANCIAL");

      document
        .font("Helvetica")
        .fontSize(11)
        .fillColor(green)
        .text("Payment Receipt");

      document.moveDown(1.5);

      if (testMode) {
        document
          .font("Helvetica-Bold")
          .fontSize(13)
          .fillColor("#A94442")
          .text("TEST DOCUMENT - NOT PROOF OF PAYMENT");

        document.moveDown();
      }

      document
        .moveTo(50, document.y)
        .lineTo(562, document.y)
        .strokeColor("#D6E2E8")
        .stroke();

      document.moveDown();

      const rows = [
        ["Receipt Number", receipt.receiptNumber],
        ["Customer", receipt.clientName],
        ["Payment Date", formatDate(receipt.paymentConfirmedAt)],
        ["Amount Paid", formatAmount(receipt.amountPaidCents)],
        ["Currency", receipt.currency]
      ];

      if (receipt.serviceDescription) {
        rows.push(["Service", receipt.serviceDescription]);
      }

      if (receipt.invoiceNumber) {
        rows.push(["Invoice", receipt.invoiceNumber]);
      }

      for (const [label, value] of rows) {
        document
          .font("Helvetica-Bold")
          .fontSize(10)
          .fillColor(dark)
          .text(label);

        document
          .font("Helvetica")
          .fontSize(12)
          .fillColor("#333333")
          .text(value);

        document.moveDown(0.7);
      }

      document.moveDown();

      document
        .font("Helvetica-Bold")
        .fontSize(14)
        .fillColor(green)
        .text(
          testMode
            ? "TEST DATA ONLY"
            : "Payment Recorded"
        );

      document.moveDown(0.5);

      document
        .font("Helvetica")
        .fontSize(10)
        .fillColor("#555555")
        .text(
          testMode
            ? "This document contains synthetic payment information."
            : "This receipt records a completed payment confirmed by the payment processor."
        );

      document.moveDown(2);

      document
        .fontSize(9)
        .fillColor("#777777")
        .text(
          "Mega Financial | Secure Client Payment Records",
          { align: "center" }
        );

      document.end();
    } catch (error) {
      reject(error);
      document.destroy();
    }
  });
}

module.exports = {
  generateReceiptPdf,
  validateReceiptData,
  formatAmount,
  formatDate
};
