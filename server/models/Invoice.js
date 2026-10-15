
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



module.exports = mongoose.model(
  "Invoice",
  invoiceSchema
);
