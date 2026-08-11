const mongoose = require("mongoose");

const {
  APPOINTMENT_SERVICE_OPTIONS,
  APPOINTMENT_PLATFORM_OPTIONS,
  APPOINTMENT_STATUS_OPTIONS,
  APPOINTMENT_DURATION_MINUTES
} = require(
  "../constants/appointmentOptions"
);

const appointmentSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      immutable: true,
      index: true
    },

    serviceType: {
      type: String,
      required: true,
      enum: APPOINTMENT_SERVICE_OPTIONS,
      trim: true
    },

    platformType: {
      type: String,
      required: true,
      enum: APPOINTMENT_PLATFORM_OPTIONS,
      trim: true
    },

    appointmentStart: {
      type: Date,
      required: true,
      index: true
    },

    durationMinutes: {
      type: Number,
      required: true,
      min: APPOINTMENT_DURATION_MINUTES,
      max: APPOINTMENT_DURATION_MINUTES,
      default: APPOINTMENT_DURATION_MINUTES,
      immutable: true
    },

    clientNotes: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: ""
    },

    status: {
      type: String,
      required: true,
      enum: APPOINTMENT_STATUS_OPTIONS,
      default: "requested",
      index: true
    },

    meetingLink: {
      type: String,
      trim: true,
      maxlength: 2048,
      default: null,
      select: false
    },

    cancellationReason: {
      type: String,
      trim: true,
      maxlength: 500,
      default: ""
    },

    cancelledAt: {
      type: Date,
      default: null
    },

    confirmedAt: {
      type: Date,
      default: null
    },

    completedAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true
  }
);

appointmentSchema.index({
  user: 1,
  appointmentStart: 1
});

appointmentSchema.index({
  user: 1,
  status: 1,
  appointmentStart: 1
});

appointmentSchema.index({
  appointmentStart: 1,
  status: 1
});

module.exports = mongoose.model(
  "Appointment",
  appointmentSchema
);
