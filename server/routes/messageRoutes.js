const express = require("express");
const protect = require(
  "../middleware/authMiddleware"
);

const {
  requireClient
} = require(
  "../middleware/roleAuthorizationMiddleware"
);

const Message = require("../models/Message");
const Notification = require(
  "../models/Notification"
);
const User = require("../models/User");

const router = express.Router();

const DEFAULT_MESSAGE_LIMIT = 25;
const MAX_MESSAGE_LIMIT = 50;

function parseMessageLimit(value) {
  const parsed = Number.parseInt(
    value,
    10
  );

  if (
    !Number.isInteger(parsed) ||
    parsed < 1
  ) {
    return DEFAULT_MESSAGE_LIMIT;
  }

  return Math.min(
    parsed,
    MAX_MESSAGE_LIMIT
  );
}

function normalizeMessageText(value) {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
}

function buildSafeMessageRecord(
  messageRecord
) {
  return {
    id: messageRecord._id,

    senderRole:
      messageRecord.senderRole,

    messageText:
      messageRecord.messageText,

    createdAt:
      messageRecord.createdAt
  };
}

router.get(
  "/me",
  protect,
  requireClient,
  async (req, res) => {
    try {
      const limit =
        parseMessageLimit(
          req.query.limit
        );

      const messages =
        await Message.find({
          client: req.user.id
        })
          .sort({
            createdAt: -1
          })
          .limit(limit)
          .select(
            "_id senderRole messageText createdAt"
          )
          .lean();

      return res.status(200).json({
        success: true,
        messages:
          messages
            .reverse()
            .map(
              buildSafeMessageRecord
            )
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message:
          "Messages could not be retrieved."
      });
    }
  }
);

router.post(
  "/me",
  protect,
  requireClient,
  async (req, res) => {
    try {
      const messageText =
        normalizeMessageText(
          req.body.messageText
        );

      if (
        !messageText ||
        messageText.length > 2000
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Message text must contain between 1 and 2000 characters."
        });
      }

      const messageRecord =
        await Message.create({
          client: req.user.id,
          sender: req.user.id,
          senderRole: "client",
          messageText
        });

      const administrators =
        await User.find({
          role: {
            $in: [
              "general_admin",
              "executive_admin"
            ]
          }
        })
          .select("_id")
          .lean();

      if (administrators.length > 0) {
        await Notification.insertMany(
          administrators.map(
            (administrator) => ({
              user: administrator._id,
              type: "new_message",
              message:
                "A client sent a new secure portal message.",
              relatedMessage:
                messageRecord._id
            })
          )
        );
      }

      return res.status(201).json({
        success: true,
        message:
          "Your secure message was sent.",
        portalMessage:
          buildSafeMessageRecord(
            messageRecord
          )
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message:
          "Your message could not be sent."
      });
    }
  }
);

module.exports = router;
