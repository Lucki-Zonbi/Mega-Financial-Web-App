const path = require("path");
const mongoose = require("mongoose");

const {
  ALLOWED_DOCUMENT_CATEGORY_KEYS
} = require("../constants/documentCategories");

const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png"
];

const MAX_DOCUMENT_SIZE_BYTES = 10 * 1024 * 1024;

function sanitizeOriginalFileName(value) {
  if (typeof value !== "string") {
    return value;
  }

  return path
    .basename(value.replace(/\\/g, "/"))
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .trim();
}

const documentMetadataSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      immutable: true,
      index: true
    },

    taxYear: {
      type: Number,
      required: true,
      min: 2000,
      max: 2100
    },

    checklistKey: {
      type: String,
      required: true,
      enum: ALLOWED_DOCUMENT_CATEGORY_KEYS,
      trim: true
    },

    originalFileName: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
      maxlength: 255,
      set: sanitizeOriginalFileName
    },

    storedFileName: {
      type: String,
      trim: true,
      maxlength: 255,
      default: null
    },

    mimeType: {
      type: String,
      required: true,
      enum: ALLOWED_MIME_TYPES,
      trim: true,
      lowercase: true
    },

    sizeBytes: {
      type: Number,
      required: true,
      min: 1,
      max: MAX_DOCUMENT_SIZE_BYTES
    },

    uploadStatus: {
      type: String,
      enum: ["pending", "stored", "failed", "removed"],
      default: "pending"
    },

    reviewStatus: {
      type: String,
      enum: [
        "not_reviewed",
        "under_review",
        "accepted",
        "rejected"
      ],
      default: "not_reviewed"
    },

    uploadedAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true
  }
);

documentMetadataSchema.index({
  user: 1,
  taxYear: 1
});

documentMetadataSchema.index({
  user: 1,
  taxYear: 1,
  checklistKey: 1
});

documentMetadataSchema.index({
  user: 1,
  reviewStatus: 1
});

module.exports = mongoose.model(
  "DocumentMetadata",
  documentMetadataSchema
);

module.exports.ALLOWED_MIME_TYPES = ALLOWED_MIME_TYPES;

module.exports.MAX_DOCUMENT_SIZE_BYTES =
  MAX_DOCUMENT_SIZE_BYTES;

module.exports.sanitizeOriginalFileName =
  sanitizeOriginalFileName;
