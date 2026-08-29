const express = require("express");
const mongoose = require("mongoose");
const protect = require(
  "../middleware/authMiddleware"
);

const Notification = require(
  "../models/Notification"
);

const router = express.Router();

const DEFAULT_NOTIFICATION_LIMIT = 20;
const MAX_NOTIFICATION_LIMIT = 50;

function parseNotificationLimit(value) {
  const parsed = Number.parseInt(
    value,
    10
  );

  if (
    !Number.isInteger(parsed) ||
    parsed < 1
  ) {
    return DEFAULT_NOTIFICATION_LIMIT;
  }

  return Math.min(
    parsed,
    MAX_NOTIFICATION_LIMIT
  );
}

function buildSafeNotificationRecord(
  notification
) {
  return {
    id: notification._id,
    type: notification.type,
    message: notification.message,
    isRead: notification.isRead,
    readAt: notification.readAt,
    createdAt: notification.createdAt
  };
}

router.get(
  "/me",
  protect,
  async (req, res) => {
    try {
      const limit =
        parseNotificationLimit(
          req.query.limit
        );

      const notifications =
        await Notification.find({
          user: req.user.id
        })
          .sort({
            createdAt: -1
          })
          .limit(limit)
          .select(
            "_id type message isRead readAt createdAt"
          )
          .lean();

      const unreadCount =
        await Notification.countDocuments({
          user: req.user.id,
          isRead: false
        });

      return res.status(200).json({
        success: true,
        unreadCount,
        notifications:
          notifications.map(
            buildSafeNotificationRecord
          )
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message:
          "Notifications could not be retrieved."
      });
    }
  }
);

router.patch(
  "/:notificationId/read",
  protect,
  async (req, res) => {
    try {
      const {
        notificationId
      } = req.params;

      if (
        !mongoose.isValidObjectId(
          notificationId
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "A valid notification identifier is required."
        });
      }

      const notification =
        await Notification.findOne({
          _id: notificationId,
          user: req.user.id
        });

      if (!notification) {
        return res.status(404).json({
          success: false,
          message:
            "The requested notification was not found."
        });
      }

      if (!notification.isRead) {
        notification.isRead = true;
        notification.readAt =
          new Date();

        await notification.save();
      }

      return res.status(200).json({
        success: true,
        notification:
          buildSafeNotificationRecord(
            notification
          )
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message:
          "The notification could not be updated."
      });
    }
  }
);

module.exports = router;
