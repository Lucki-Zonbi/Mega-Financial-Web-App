const APPOINTMENT_SERVICE_OPTIONS = Object.freeze([
  "Individual Tax Filing",
  "Business Tax Filing",
  "Bookkeeping",
  "Payroll Support",
  "Tax Planning"
]);

const APPOINTMENT_PLATFORM_OPTIONS = Object.freeze([
  "Microsoft Teams",
  "Google Meet",
  "Zoom",
  "Calendly"
]);

const APPOINTMENT_STATUS_OPTIONS = Object.freeze([
  "requested",
  "confirmed",
  "completed",
  "cancelled"
]);

const CLIENT_CANCELLABLE_APPOINTMENT_STATUSES =
  Object.freeze([
    "requested",
    "confirmed"
  ]);

const APPOINTMENT_DURATION_MINUTES = 60;

const MINIMUM_APPOINTMENT_NOTICE_HOURS = 24;

const MAXIMUM_APPOINTMENT_ADVANCE_DAYS = 180;

const APPOINTMENT_START_HOUR = 9;

const APPOINTMENT_END_HOUR = 17;

module.exports = {
  APPOINTMENT_SERVICE_OPTIONS,
  APPOINTMENT_PLATFORM_OPTIONS,
  APPOINTMENT_STATUS_OPTIONS,
  CLIENT_CANCELLABLE_APPOINTMENT_STATUSES,
  APPOINTMENT_DURATION_MINUTES,
  MINIMUM_APPOINTMENT_NOTICE_HOURS,
  MAXIMUM_APPOINTMENT_ADVANCE_DAYS,
  APPOINTMENT_START_HOUR,
  APPOINTMENT_END_HOUR
};
