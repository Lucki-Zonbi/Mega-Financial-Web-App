const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      trim: true,
      required: false
    },

    email: {
      type: String,
      trim: true,
      lowercase: true,
      unique: true,
      required: false
    },

    phone: {
      type: String,
      trim: true,
      required: false
    },

    passwordHash: {
      type: String,
      required: false
    },

    role: {
      type: String,
      enum: ["client", "admin"],
      default: "client"
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model("User", userSchema);
