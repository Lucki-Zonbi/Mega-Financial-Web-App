const mongoose = require("mongoose");

const NOTIFICATION_TYPES =
  Object.freeze([
    "new_message"
  ]);

const notificationSchema =
  new mongoose.Schema(
    {
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        immutable: true,
        index: true
      },

      type: {
        type: String,
        required: true,
        enum: NOTIFICATION_TYPES,
        immutable: true
      },

      message: {
        type: String,
        required: true,
        trim: true,
        maxlength: 300
      },

      relatedMessage: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Message",
        default: null,
        immutable: true
      },

      isRead: {
        type: Boolean,
        default: false,
        index: true
      },

      readAt: {
        type: Date,
        default: null
      }
    },
    {
      timestamps: true,
      versionKey: false
    }
  );

notificationSchema.index({
  user: 1,
  createdAt: -1
});

notificationSchema.index({
  user: 1,
  isRead: 1,
  createdAt: -1
});

module.exports = mongoose.model(
  "Notification",
  notificationSchema
);
