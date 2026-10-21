"use strict";

const mongoose = require("mongoose");

const receiptSchema = new mongoose.Schema(
  {
    receiptNumber: {
      type: String,
      required: true,
      unique: true,
      immutable: true,
      trim: true,
      minlength: 1,
      maxlength: 100
    },

    invoice: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Invoice",
      required: false,
      default: undefined,
      immutable: true
    },

    client: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      immutable: true,
      index: true
    },

    amountPaidCents: {
      type: Number,
      required: true,
      min: 1,
      max: 100000000,
      immutable: true,
      validate: {
        validator(value) {
          return Number.isSafeInteger(value);
        },
        message:
          "Receipt payment amount must be a safe integer."
      }
    },

    currency: {
      type: String,
      required: true,
      enum: ["usd"],
      default: "usd",
      immutable: true
    },

    paymentConfirmedAt: {
      type: Date,
      required: true,
      immutable: true
    },

    stripePaymentIntentId: {
      type: String,
      trim: true,
      default: undefined,
      immutable: true,
      select: false
    },

    stripeCheckoutSessionId: {
      type: String,
      trim: true,
      default: undefined,
      immutable: true,
      select: false
    },

    pdfStorageKey: {
      type: String,
      trim: true,
      default: undefined,
      select: false
    },

    pdfGeneratedAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true,
    strict: "throw"
  }
);

// ==================================================
// PHASE 2 — DATABASE INDEXES
// ==================================================

// An internal invoice is optional for Calendly-originated
// Stripe payments. When an invoice is associated with a
// receipt, it must not be associated with another receipt.
receiptSchema.index(
  { invoice: 1 },
  {
    unique: true,
    partialFilterExpression: {
      invoice: {
        $type: "objectId"
      }
    }
  }
);

// Efficient client receipt history.
receiptSchema.index({
  client: 1,
  createdAt: -1
});

// Prevent the same Stripe PaymentIntent from being
// associated with multiple receipts.
receiptSchema.index(
  { stripePaymentIntentId: 1 },
  {
    unique: true,
    partialFilterExpression: {
      stripePaymentIntentId: {
        $type: "string"
      }
    }
  }
);

// Prevent duplicate Checkout Session references.
receiptSchema.index(
  { stripeCheckoutSessionId: 1 },
  {
    unique: true,
    partialFilterExpression: {
      stripeCheckoutSessionId: {
        $type: "string"
      }
    }
  }
);

// ==================================================
// PHASE 2 — DOCUMENT VALIDATION
// ==================================================

receiptSchema.pre("validate", function () {
    // Every completed receipt must have at least one
  // Stripe payment reference.
  const paymentIntentId =
    this.stripePaymentIntentId?.trim();

  const checkoutSessionId =
    this.stripeCheckoutSessionId?.trim();

  if (!paymentIntentId && !checkoutSessionId) {
    this.invalidate(
      "stripePaymentIntentId",
      "A receipt requires a Stripe payment reference."
    );
  }

  if (
    paymentIntentId &&
    !/^pi_[A-Za-z0-9]+$/.test(paymentIntentId)
  ) {
    this.invalidate(
      "stripePaymentIntentId",
      "Invalid Stripe PaymentIntent identifier."
    );
  }

  if (
    checkoutSessionId &&
    !/^cs_(test_|live_)[A-Za-z0-9]+$/.test(
      checkoutSessionId
    )
  ) {
    this.invalidate(
      "stripeCheckoutSessionId",
      "Invalid Stripe Checkout Session identifier."
    );
  }

  if (
    this.paymentConfirmedAt &&
    this.paymentConfirmedAt.getTime() > Date.now()
  ) {
    this.invalidate(
      "paymentConfirmedAt",
      "Payment confirmation cannot be in the future."
    );
  }

  if (
    this.pdfGeneratedAt &&
    !this.pdfStorageKey
  ) {
    this.invalidate(
      "pdfStorageKey",
      "A generated receipt PDF requires a storage reference."
    );
  }

  if (
    this.pdfStorageKey &&
    !this.pdfGeneratedAt
  ) {
    this.invalidate(
      "pdfGeneratedAt",
      "A stored receipt PDF requires a generation timestamp."
    );
  }
});

// ==================================================
// PHASE 2 — MODEL EXPORT
// ==================================================

module.exports = mongoose.model(
  "Receipt",
  receiptSchema
);
