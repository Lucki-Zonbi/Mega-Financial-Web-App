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

// Historical internal scheduling:
// New appointment creation has been retired.
// Clients must use Mega Financial's external booking service.

router.post(
  "/",
  protect,
  requireClient,
  (req, res) => {
    return res.status(410).json({
      success: false,
      code: "INTERNAL_SCHEDULING_RETIRED",
      message:
        "Internal appointment requests are no longer available. " +
        "Please use Mega Financial's official scheduling page.",
      schedulingPath: "/schedule.html"
    });
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

// Historical internal scheduling:
// Internal appointment cancellation has been retired.
// External booking changes are managed through GoDaddy.

router.patch(
  "/:appointmentId/cancel",
  protect,
  requireClient,
  (req, res) => {
    return res.status(410).json({
      success: false,
      code: "INTERNAL_SCHEDULING_RETIRED",
      message:
        "Internal appointment cancellation is no longer available. " +
        "Please manage new bookings through Mega Financial's " +
        "official scheduling service.",
      schedulingPath: "/schedule.html"
    });
  }
);

module.exports = router;
