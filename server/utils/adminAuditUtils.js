const AuditLog = require(
  "../models/AuditLog"
);

async function recordAdminAuditEvent({
  administratorId,
  administratorRole,
  clientId,
  action,
  resourceType,
  resourceId,
  previousStatus,
  newStatus
}) {
  return AuditLog.create({
    administrator:
      administratorId,

    administratorRole,

    client:
      clientId,

    action,

    resourceType,

    resourceId,

    previousStatus,

    newStatus
  });
}

module.exports = {
  recordAdminAuditEvent
};
