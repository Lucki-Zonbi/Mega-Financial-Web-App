const mongoose = require("mongoose");

const {
  POLICY_TYPES
} = require(
  "../constants/policyVersions"
);

const policyAcknowledgementSchema =
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

      policyType: {
        type: String,
        enum: POLICY_TYPES,
        required: true,
        immutable: true
      },

      policyVersion: {
        type: String,
        required: true,
        trim: true,
        immutable: true
      },

      policyTitle: {
        type: String,
        required: true,
        trim: true,
        immutable: true
      },

      acknowledgementText: {
        type: String,
        required: true,
        trim: true,
        immutable: true
      },

      acknowledgedAt: {
        type: Date,
        required: true,
        immutable: true
      },

      acknowledgementDocumentKey: {
        type: String,
        required: true,
        trim: true,
        immutable: true
      },

      acknowledgementDocumentHash: {
        type: String,
        required: true,
        trim: true,
        immutable: true
      }
    },
    {
      timestamps: true,
      versionKey: false
    }
  );

policyAcknowledgementSchema.index(
  {
    user: 1,
    policyType: 1,
    policyVersion: 1
  },
  {
    unique: true
  }
);

policyAcknowledgementSchema.index({
  user: 1,
  acknowledgedAt: -1
});

module.exports =
  mongoose.model(
    "PolicyAcknowledgement",
    policyAcknowledgementSchema
  );
