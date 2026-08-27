const mongoose =
  require("mongoose");

const {
  PAYMENT_SERVICE_OPTIONS
} = require(
  "../constants/paymentOptions"
);

const PAYMENT_STATUS_OPTIONS =
  Object.freeze([
    "pending",
    "paid",
    "failed",
    "expired"
  ]);

const paymentSchema =
  new mongoose.Schema(
    {
      user: {
        type:
          mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        immutable: true,
        index: true
      },

      serviceKey: {
        type: String,
        required: true,
        enum:
          Object.keys(
            PAYMENT_SERVICE_OPTIONS
          ),
        immutable: true
      },

      serviceName: {
        type: String,
        required: true,
        enum:
          Object.values(
            PAYMENT_SERVICE_OPTIONS
          ).map((option) => {
            return option.serviceName;
          }),
        immutable: true
      },

      status: {
        type: String,
        required: true,
        enum:
          PAYMENT_STATUS_OPTIONS,
        default: "pending",
        index: true
      },

      amountTotal: {
        type: Number,
        min: 0,
        default: null
      },

      currency: {
        type: String,
        trim: true,
        lowercase: true,
        maxlength: 10,
        default: null
      },

      stripeCheckoutSessionId: {
        type: String,
        trim: true,
        default: undefined,
        select: false,
        unique: true,
        sparse: true
      },

      stripePaymentIntentId: {
        type: String,
        trim: true,
        default: undefined,
        select: false
      },

      checkoutCreatedAt: {
        type: Date,
        default: Date.now
      },

      paidAt: {
        type: Date,
        default: null
      }
    },
    {
      timestamps: true
    }
  );

paymentSchema.index({
  user: 1,
  createdAt: -1
});

paymentSchema.index({
  user: 1,
  status: 1,
  createdAt: -1
});

module.exports =
  mongoose.model(
    "Payment",
    paymentSchema
  );
