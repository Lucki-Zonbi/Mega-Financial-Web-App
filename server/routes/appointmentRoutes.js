const express = require("express");
const mongoose = require("mongoose");

const protect = require(
  "../middleware/authMiddleware"
);

const {
  requireClient
} = require(
  "../middleware/roleAuthorizationMiddleware"
);

const Appointment = require(
  "../models/Appointment"
);

const {
  APPOINTMENT_SERVICE_OPTIONS,
  APPOINTMENT_PLATFORM_OPTIONS,
  CLIENT_CANCELLABLE_APPOINTMENT_STATUSES,
  APPOINTMENT_DURATION_MINUTES,
  MINIMUM_APPOINTMENT_NOTICE_HOURS,
  MAXIMUM_APPOINTMENT_ADVANCE_DAYS,
  APPOINTMENT_START_HOUR,
  APPOINTMENT_END_HOUR
} = require(
  "../constants/appointmentOptions"
);

const router = express.Router();

const ACTIVE_APPOINTMENT_STATUSES = Object.freeze([
  "requested",
  "confirmed"
]);

function cleanString(value) {
  return String(value || "").trim();
}

function hasOwnProperty(object, property) {
  return Object.prototype.hasOwnProperty.call(
    object,
    property
  );
}

function getMinimumAppointmentDate() {
  return new Date(
    Date.now() +
      MINIMUM_APPOINTMENT_NOTICE_HOURS *
        60 *
        60 *
        1000
  );
}

function getMaximumAppointmentDate() {
  return new Date(
    Date.now() +
      MAXIMUM_APPOINTMENT_ADVANCE_DAYS *
        24 *
        60 *
        60 *
        1000
  );
}

function parseAppointmentStart({
  appointmentDate,
  appointmentTime
}) {
  const normalizedDate =
    cleanString(appointmentDate);

  const normalizedTime =
    cleanString(appointmentTime);

  const datePattern =
    /^\d{4}-\d{2}-\d{2}$/;

  const timePattern =
    /^\d{2}:\d{2}$/;

  if (
    !datePattern.test(normalizedDate) ||
    !timePattern.test(normalizedTime)
  ) {
    return null;
  }

  const [
    yearString,
    monthString,
    dayString
  ] = normalizedDate.split("-");

  const [
    hourString,
    minuteString
  ] = normalizedTime.split(":");

  const year = Number(yearString);
  const month = Number(monthString);
  const day = Number(dayString);
  const hour = Number(hourString);
  const minute = Number(minuteString);

  if (
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    !Number.isInteger(day) ||
    !Number.isInteger(hour) ||
    !Number.isInteger(minute)
  ) {
    return null;
  }

  const appointmentStart = new Date(
    year,
    month - 1,
    day,
    hour,
    minute,
    0,
    0
  );

  const dateComponentsMatch =
    appointmentStart.getFullYear() === year &&
    appointmentStart.getMonth() === month - 1 &&
    appointmentStart.getDate() === day &&
    appointmentStart.getHours() === hour &&
    appointmentStart.getMinutes() === minute;

  if (!dateComponentsMatch) {
    return null;
  }

  return appointmentStart;
}

function isAllowedAppointmentTime(
  appointmentStart
) {
  const dayOfWeek =
    appointmentStart.getDay();

  const hour =
    appointmentStart.getHours();

  const minute =
    appointmentStart.getMinutes();

  const isWeekday =
    dayOfWeek >= 1 &&
    dayOfWeek <= 5;

  const isWholeHour =
    minute === 0;

  const isWithinBusinessHours =
    hour >= APPOINTMENT_START_HOUR &&
    hour < APPOINTMENT_END_HOUR;

  return (
    isWeekday &&
    isWholeHour &&
    isWithinBusinessHours
  );
}

function buildSafeAppointmentResponse(
  appointment
) {
  return {
    id: appointment._id,
    serviceType: appointment.serviceType,
    platformType: appointment.platformType,
    appointmentStart:
      appointment.appointmentStart,
    durationMinutes:
      appointment.durationMinutes,
    clientNotes:
      appointment.clientNotes,
    status: appointment.status,
    cancellationReason:
      appointment.cancellationReason,
    cancelledAt:
      appointment.cancelledAt,
    confirmedAt:
      appointment.confirmedAt,
    completedAt:
      appointment.completedAt,
    createdAt:
      appointment.createdAt,
    updatedAt:
      appointment.updatedAt
  };
}

function getFriendlyValidationMessage(error) {
  if (
    error &&
    error.name === "ValidationError"
  ) {
    const firstValidationError =
      Object.values(error.errors)[0];

    if (firstValidationError) {
      return firstValidationError.message;
    }
  }

  return null;
}

router.post(
  "/",
  protect,
  requireClient,
  async (req, res) => {
    try {
      const forbiddenClientFields = [
        "user",
        "userId",
        "clientId",
        "owner",
        "ownerId",
        "status",
        "durationMinutes",
        "meetingLink",
        "cancelledAt",
        "confirmedAt",
        "completedAt"
      ].filter((field) => {
        return hasOwnProperty(
          req.body,
          field
        );
      });

      if (
        forbiddenClientFields.length > 0
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Ownership, status, duration, meeting-link, and administrative appointment fields cannot be supplied by the client."
        });
      }

      const serviceType =
        cleanString(
          req.body.serviceType
        );

      const platformType =
        cleanString(
          req.body.platformType
        );

      const clientNotes =
        cleanString(
          req.body.clientNotes
        );

      if (
        !APPOINTMENT_SERVICE_OPTIONS.includes(
          serviceType
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Please select a valid Mega Financial service."
        });
      }

      if (
        !APPOINTMENT_PLATFORM_OPTIONS.includes(
          platformType
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Please select a valid consultation platform."
        });
      }

      if (clientNotes.length > 1000) {
        return res.status(400).json({
          success: false,
          message:
            "Appointment notes cannot exceed 1,000 characters."
        });
      }

      const appointmentStart =
        parseAppointmentStart({
          appointmentDate:
            req.body.appointmentDate,
          appointmentTime:
            req.body.appointmentTime
        });

      if (!appointmentStart) {
        return res.status(400).json({
          success: false,
          message:
            "Please provide a valid appointment date and time."
        });
      }

      if (
        appointmentStart <
        getMinimumAppointmentDate()
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Appointments must be requested at least 24 hours in advance."
        });
      }

      if (
        appointmentStart >
        getMaximumAppointmentDate()
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Appointments cannot be requested more than 180 days in advance."
        });
      }

      if (
        !isAllowedAppointmentTime(
          appointmentStart
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Appointments must begin on a weekday at a whole-hour time between 9:00 AM and 4:00 PM."
        });
      }

      const existingClientAppointment =
        await Appointment.findOne({
          user: req.user.id,
          status: {
            $in: ACTIVE_APPOINTMENT_STATUSES
          },
          appointmentStart
        })
          .select("_id")
          .lean();

      if (existingClientAppointment) {
        return res.status(409).json({
          success: false,
          message:
            "You already have an active appointment request for that date and time."
        });
      }

      const occupiedAppointment =
        await Appointment.findOne({
          status: {
            $in: ACTIVE_APPOINTMENT_STATUSES
          },
          appointmentStart
        })
          .select("_id")
          .lean();

      if (occupiedAppointment) {
        return res.status(409).json({
          success: false,
          message:
            "That appointment time is no longer available. Please choose another time."
        });
      }

      const appointment =
        await Appointment.create({
          user: req.user.id,
          serviceType,
          platformType,
          appointmentStart,
          durationMinutes:
            APPOINTMENT_DURATION_MINUTES,
          clientNotes,
          status: "requested"
        });

      return res.status(201).json({
        success: true,
        message:
          "Your appointment request was submitted securely and is awaiting confirmation.",
        appointment:
          buildSafeAppointmentResponse(
            appointment
          )
      });
    } catch (error) {
      console.error(
        "Appointment request error:",
        error.message
      );

      const validationMessage =
        getFriendlyValidationMessage(error);

      if (validationMessage) {
        return res.status(400).json({
          success: false,
          message: validationMessage
        });
      }

      return res.status(500).json({
        success: false,
        message:
          "The appointment request could not be submitted."
      });
    }
  }
);

router.get(
  "/me",
  protect,
  requireClient,
  async (req, res) => {
    try {
      const appointments =
        await Appointment.find({
          user: req.user.id
        })
          .select(
            "_id serviceType platformType " +
            "appointmentStart durationMinutes " +
            "clientNotes status cancellationReason " +
            "cancelledAt confirmedAt completedAt " +
            "createdAt updatedAt"
          )
          .sort({
            appointmentStart: 1,
            _id: 1
          })
          .lean();

      return res.status(200).json({
        success: true,
        message:
          "Protected client appointments retrieved.",
        count: appointments.length,
        appointments
      });
    } catch (error) {
      console.error(
        "Appointment retrieval error:",
        error.message
      );

      return res.status(500).json({
        success: false,
        message:
          "Your appointments could not be retrieved."
      });
    }
  }
);

router.get(
  "/me/upcoming",
  protect,
  requireClient,
  async (req, res) => {
    try {
      const appointment =
        await Appointment.findOne({
          user: req.user.id,
          status: {
            $in: ACTIVE_APPOINTMENT_STATUSES
          },
          appointmentStart: {
            $gte: new Date()
          }
        })
          .select(
            "_id serviceType platformType " +
            "appointmentStart durationMinutes " +
            "status createdAt updatedAt"
          )
          .sort({
            appointmentStart: 1,
            _id: 1
          })
          .lean();

      return res.status(200).json({
        success: true,
        message: appointment
          ? "Upcoming appointment retrieved."
          : "No upcoming appointment was found.",
        appointment
      });
    } catch (error) {
      console.error(
        "Upcoming appointment retrieval error:",
        error.message
      );

      return res.status(500).json({
        success: false,
        message:
          "Your upcoming appointment could not be retrieved."
      });
    }
  }
);

router.patch(
  "/:appointmentId/cancel",
  protect,
  requireClient,
  async (req, res) => {
    try {
      const {
        appointmentId
      } = req.params;

      if (
        !mongoose.isValidObjectId(
          appointmentId
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "A valid appointment identifier is required."
        });
      }

      const forbiddenCancellationFields = [
        "user",
        "userId",
        "clientId",
        "status",
        "appointmentStart",
        "serviceType",
        "platformType",
        "durationMinutes",
        "meetingLink",
        "cancelledAt",
        "confirmedAt",
        "completedAt"
      ].filter((field) => {
        return hasOwnProperty(
          req.body,
          field
        );
      });

      if (
        forbiddenCancellationFields.length >
        0
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Only an optional cancellation reason may be supplied."
        });
      }

      const cancellationReason =
        cleanString(
          req.body.cancellationReason
        );

      if (
        cancellationReason.length > 500
      ) {
        return res.status(400).json({
          success: false,
          message:
            "The cancellation reason cannot exceed 500 characters."
        });
      }

      const appointment =
        await Appointment.findOne({
          _id: appointmentId,
          user: req.user.id
        });

      if (!appointment) {
        return res.status(404).json({
          success: false,
          message:
            "The requested appointment was not found."
        });
      }

      if (
        !CLIENT_CANCELLABLE_APPOINTMENT_STATUSES.includes(
          appointment.status
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "This appointment can no longer be cancelled through the client portal."
        });
      }

      if (
        appointment.appointmentStart <=
        new Date()
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Past appointments cannot be cancelled through the client portal."
        });
      }

      appointment.status =
        "cancelled";

      appointment.cancellationReason =
        cancellationReason;

      appointment.cancelledAt =
        new Date();

      await appointment.save();

      return res.status(200).json({
        success: true,
        message:
          "Your appointment was cancelled.",
        appointment:
          buildSafeAppointmentResponse(
            appointment
          )
      });
    } catch (error) {
      console.error(
        "Appointment cancellation error:",
        error.message
      );

      const validationMessage =
        getFriendlyValidationMessage(error);

      if (validationMessage) {
        return res.status(400).json({
          success: false,
          message: validationMessage
        });
      }

      return res.status(500).json({
        success: false,
        message:
          "The appointment could not be cancelled."
      });
    }
  }
);

module.exports = router;
