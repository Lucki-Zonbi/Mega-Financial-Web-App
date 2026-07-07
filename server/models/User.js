const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      trim: true,
      required: true
    },

    email: {
      type: String,
      trim: true,
      lowercase: true,
      unique: true,
      required: true
    },

    phone: {
      type: String,
      trim: true,
      required: true
    },

    passwordHash: {
      type: String,
      required: true,
      select: false
    },

    role: {
      type: String,
      enum: ["client", "general_admin", "executive_admin"],
      default: "client"
    },

    isEmailVerified: {
      type: Boolean,
      default: false
    },

    twoFactorEnabled: {
      type: Boolean,
      default: false
    },

    preferredTwoFactorMethod: {
      type: String,
      enum: ["email", "sms", null],
      default: null
    },

    lastAdminVerificationAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model("User", userSchema);
