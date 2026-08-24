const mongoose = require("mongoose");

const AUDIT_ACTIONS = Object.freeze([
  "document_review_status_changed",
  "appointment_status_changed"
]);

const AUDIT_RESOURCE_TYPES =
  Object.freeze([
    "document",
    "appointment"
  ]);

const auditLogSchema =
  new mongoose.Schema(
    {
      administrator: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        immutable: true,
        index: true
      },

      administratorRole: {
        type: String,
        required: true,
        enum: [
          "general_admin",
          "executive_admin"
        ],
        immutable: true
      },

      client: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        immutable: true,
        index: true
      },

      action: {
        type: String,
        required: true,
        enum: AUDIT_ACTIONS,
        immutable: true,
        index: true
      },

      resourceType: {
        type: String,
        required: true,
        enum: AUDIT_RESOURCE_TYPES,
        immutable: true
      },

      resourceId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        immutable: true,
        index: true
      },

      previousStatus: {
        type: String,
        required: true,
        trim: true,
        maxlength: 100,
        immutable: true
      },

      newStatus: {
        type: String,
        required: true,
        trim: true,
        maxlength: 100,
        immutable: true
      }
    },
    {
      timestamps: true,
      versionKey: false
    }
  );

auditLogSchema.index({
  client: 1,
  createdAt: -1
});

auditLogSchema.index({
  administrator: 1,
  createdAt: -1
});

auditLogSchema.index({
  resourceType: 1,
  resourceId: 1,
  createdAt: -1
});

module.exports = mongoose.model(
  "AuditLog",
  auditLogSchema
);
