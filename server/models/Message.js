const mongoose = require("mongoose");

const MESSAGE_SENDER_ROLES =
  Object.freeze([
    "client",
    "general_admin",
    "executive_admin"
  ]);

const messageSchema =
  new mongoose.Schema(
    {
      client: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        immutable: true,
        index: true
      },

      sender: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        immutable: true,
        index: true
      },

      senderRole: {
        type: String,
        required: true,
        enum: MESSAGE_SENDER_ROLES,
        immutable: true
      },

      messageText: {
        type: String,
        required: true,
        trim: true,
        minlength: 1,
        maxlength: 2000
      }
    },
    {
      timestamps: true,
      versionKey: false
    }
  );

messageSchema.index({
  client: 1,
  createdAt: -1
});

module.exports = mongoose.model(
  "Message",
  messageSchema
);
