
const mongoose = require("mongoose");

const invoiceLineItemSchema = new mongoose.Schema(
  {
    description: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
      maxlength: 250
    },

    quantity: {
      type: Number,
      required: true,
      min: 1,
      max: 1000,
      validate: Number.isInteger
    },

    unitAmountCents: {
      type: Number,
      required: true,
      min: 0,
      max: 100000000,
      validate: Number.isSafeInteger
    }
  },
  {
    _id: false
  }
);

const invoiceSchema = new mongoose.Schema(
  {
    invoiceNumber: {
      type: String,
      required: true,
      unique: true,
      immutable: true,
      trim: true
    },

    client: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      immutable: true,
      index: true
    },

    issuedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      immutable: true
    },

    lineItems: {
      type: [invoiceLineItemSchema],
      required: true,
      validate: {
        validator(items) {
          return Array.isArray(items) &&
            items.length > 0 &&
            items.length <= 50;
        },
        message: "An invoice requires 1 to 50 line items."
      }
    },

    amountTotalCents: {
      type: Number,
      required: true,
      min: 1,
      validate: Number.isSafeInteger
    },

    currency: {
      type: String,
      enum: ["usd"],
      default: "usd",
      immutable: true
    },

    status: {
      type: String,
      enum: [
        "draft",
        "issued",
        "paid",
        "void"
      ],
      default: "draft",
      required: true,
      index: true
    },

    issuedAt: {
      type: Date,
      default: null
    },

    dueAt: {
      type: Date,
      default: null
    },

    paidAt: {
      type: Date,
      default: null
    },

    // Phase 2 — Records when an invoice is voided.
    voidedAt: {
      type: Date,
      default: null
    },

    stripeCheckoutSessionId: {
      type: String,
      trim: true,
      default: undefined,
      select: false
    },

    stripePaymentIntentId: {
      type: String,
      trim: true,
      default: undefined,
      select: false
    },

    pdfStorageKey: {
      type: String,
      trim: true,
      default: undefined,
      select: false
    }
  },
  {
    timestamps: true
  }
);

invoiceSchema.index({
  client: 1,
  createdAt: -1
});

invoiceSchema.index({
  client: 1,
  status: 1,
  createdAt: -1
});

invoiceSchema.index(
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

invoiceSchema.index(
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



invoiceSchema.pre("validate", function () {
  if (
    !Array.isArray(this.lineItems) ||
    this.lineItems.length === 0
  ) {
    return;
  }

  const total = this.lineItems.reduce(
    (sum, item) => {
      return sum + item.quantity * item.unitAmountCents;
    },
    0
  );

  if (!Number.isSafeInteger(total) || total <= 0) {
    this.invalidate(
      "amountTotalCents",
      "The invoice total must be a positive, safe integer."
    );
  } else if (this.amountTotalCents !== total) {
    this.invalidate(
      "amountTotalCents",
      "The invoice total must equal its line items."
    );
  }
});

// Phase 2 — Invoice lifecycle consistency validation.
//
// This validates the relationship between invoice
// status and lifecycle timestamps.
//
// API routes must separately enforce authorized
// status transitions and conditional updates.

invoiceSchema.pre("validate", function () {
  const status = this.status;

  if (
  status === "void" &&
  !this.voidedAt
) {
  this.invalidate(
    "voidedAt",
    "Voided invoices require a void timestamp."
  );
}

if (
  status !== "void" &&
  this.voidedAt
) {
  this.invalidate(
    "voidedAt",
    "Only voided invoices may have a void timestamp."
  );
}

  if (
    status === "draft" &&
    (this.issuedAt || this.paidAt)
  ) {
    this.invalidate(
      "status",
      "Draft invoices cannot have issuance or payment timestamps."
    );
  }

  if (
    status === "issued" &&
    !this.issuedAt
  ) {
    this.invalidate(
      "issuedAt",
      "Issued invoices require an issuance timestamp."
    );
  }

  if (
    status === "paid" &&
    (!this.issuedAt || !this.paidAt)
  ) {
    this.invalidate(
      "status",
      "Paid invoices require issuance and payment timestamps."
    );
  }

  if (
    status === "void" &&
    this.paidAt
  ) {
    this.invalidate(
      "status",
      "Paid invoices cannot be voided."
    );
  }

  if (
    this.dueAt &&
    this.issuedAt &&
    this.dueAt < this.issuedAt
  ) {
    this.invalidate(
      "dueAt",
      "The due date cannot precede invoice issuance."
    );
  }
});

module.exports = mongoose.model(
  "Invoice",
  invoiceSchema
);
