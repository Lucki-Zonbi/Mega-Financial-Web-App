const express = require("express");
const mongoose = require("mongoose");
const PDFDocument = require("pdfkit");
const protect = require("../middleware/authMiddleware");

const {
  requireAdmin,
  requireExecutiveAdmin
} = require("../middleware/roleAuthorizationMiddleware");

const User = require("../models/User");
const TaxIntake = require("../models/TaxIntake");
const DocumentMetadata = require("../models/DocumentMetadata");
const Appointment = require("../models/Appointment");
const AuditLog = require("../models/AuditLog");
const Message = require("../models/Message");
const Notification = require(
  "../models/Notification"
);

const {
  recordAdminAuditEvent
} = require("../utils/adminAuditUtils");

const {
  getDocumentCategory
} = require("../constants/documentCategories");

const {
  readPrivateDocument
} = require(
  "../utils/documentStorageUtils"
);

const {
  DEFAULT_ADMIN_CLIENT_LIMIT,
  MAX_ADMIN_CLIENT_LIMIT,
  escapeRegularExpression,
  parseBoundedPositiveInteger,
  buildSafeClientDirectoryEntry,
  buildSafeClientAccountSummary
} = require("../utils/adminClientViewUtils");

const router = express.Router();

const REVIEW_STATUS_TRANSITIONS =
  Object.freeze({
    not_reviewed: Object.freeze([
      "under_review"
    ]),

    under_review: Object.freeze([
      "accepted",
      "rejected"
    ]),

    rejected: Object.freeze([
      "under_review"
    ]),

    accepted: Object.freeze([
      "under_review"
    ])
  });

const APPOINTMENT_STATUS_TRANSITIONS =
  Object.freeze({
    requested: Object.freeze([
      "confirmed",
      "cancelled"
    ]),

    confirmed: Object.freeze([
      "completed",
      "cancelled"
    ]),

    completed: Object.freeze([]),

    cancelled: Object.freeze([])
  });

const DEFAULT_ADMIN_MESSAGE_LIMIT = 25;
const MAX_ADMIN_MESSAGE_LIMIT = 50;

function parseAdminMessageLimit(value) {
  const parsed = Number.parseInt(
    value,
    10
  );

  if (
    !Number.isInteger(parsed) ||
    parsed < 1
  ) {
    return DEFAULT_ADMIN_MESSAGE_LIMIT;
  }

  return Math.min(
    parsed,
    MAX_ADMIN_MESSAGE_LIMIT
  );
}

function normalizeAdminMessageText(value) {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
}

function buildSafeAdminMessageRecord(
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

function buildSafeAdminDocumentRecord(
  documentRecord
) {
  const category =
    getDocumentCategory(
      documentRecord.checklistKey
    );

  return {
    id: documentRecord._id,
    taxYear: documentRecord.taxYear,
    checklistKey:
      documentRecord.checklistKey,
    categoryTitle:
      category?.title ||
      documentRecord.checklistKey,
    originalFileName:
      documentRecord.originalFileName,
    mimeType:
      documentRecord.mimeType,
    sizeBytes:
      documentRecord.sizeBytes,
    uploadStatus:
      documentRecord.uploadStatus,
    reviewStatus:
      documentRecord.reviewStatus,
    uploadedAt:
      documentRecord.uploadedAt
  };
}

function buildSafeAuditActivityRecord(
  auditRecord
) {
  return {
    id: auditRecord._id,

    administrator: {
      id:
        auditRecord.administrator?._id ||
        auditRecord.administrator,

      fullName:
        auditRecord.administrator?.fullName ||
        "Administrator",

      role:
        auditRecord.administratorRole
    },

    client: {
      id:
        auditRecord.client?._id ||
        auditRecord.client,

      fullName:
        auditRecord.client?.fullName ||
        "Client"
    },

    action:
      auditRecord.action,

    resourceType:
      auditRecord.resourceType,

    resourceId:
      auditRecord.resourceId,

    previousStatus:
      auditRecord.previousStatus,

    newStatus:
      auditRecord.newStatus,

    createdAt:
      auditRecord.createdAt
  };
}


function buildSafeAdminAppointmentRecord(
  appointment
) {
  return {
    id: appointment._id,
    serviceType:
      appointment.serviceType,
    platformType:
      appointment.platformType,
    appointmentStart:
      appointment.appointmentStart,
    durationMinutes:
      appointment.durationMinutes,
    clientNotes:
      appointment.clientNotes,
    status:
      appointment.status,
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

router.get(
  "/audit-activity",
  protect,
  requireExecutiveAdmin,
  async (req, res) => {
    try {
      const page =
        parseBoundedPositiveInteger(
          req.query.page,
          1
        );

      const limit =
        parseBoundedPositiveInteger(
          req.query.limit,
          10,
          25
        );

      const skip =
        (page - 1) * limit;

      const [
        auditRecords,
        totalRecords
      ] = await Promise.all([
        AuditLog.find({})
          .select(
            "_id administrator administratorRole " +
            "client action resourceType resourceId " +
            "previousStatus newStatus createdAt"
          )
          .populate({
            path: "administrator",
            select: "_id fullName"
          })
          .populate({
            path: "client",
            select: "_id fullName"
          })
          .sort({
            createdAt: -1,
            _id: -1
          })
          .skip(skip)
          .limit(limit)
          .lean(),

        AuditLog.countDocuments({})
      ]);

      const totalPages =
        totalRecords === 0
          ? 0
          : Math.ceil(
              totalRecords / limit
            );

      return res.status(200).json({
        success: true,

        message:
          "Authorized audit activity retrieved.",

        activity:
          auditRecords.map(
            buildSafeAuditActivityRecord
          ),

        pagination: {
          page,
          limit,
          totalRecords,
          totalPages,
          hasPreviousPage:
            page > 1,
          hasNextPage:
            totalPages > 0 &&
            page < totalPages
        }
      });
    } catch (error) {
      console.error(
        "Administrator audit activity error:",
        error.message
      );

      return res.status(500).json({
        success: false,
        message:
          "Audit activity could not be retrieved."
      });
    }
  }
);

router.get("/me", protect, requireAdmin, (req, res) => {
  res.status(200).json({
    success: true,
    message: "Protected administrator session confirmed.",
    admin: {
      id: req.user.id,
      fullName: req.user.fullName,
      email: req.user.email,
      role: req.user.role
    }
  });
});

router.get("/clients", protect, requireAdmin, async (req, res) => {
  try {
    const page = parseBoundedPositiveInteger(
      req.query.page,
      1
    );

    const limit = parseBoundedPositiveInteger(
      req.query.limit,
      DEFAULT_ADMIN_CLIENT_LIMIT,
      MAX_ADMIN_CLIENT_LIMIT
    );

    const rawSearch =
      typeof req.query.search === "string"
        ? req.query.search.trim().slice(0, 100)
        : "";

    const clientQuery = {
      role: "client"
    };

    if (rawSearch) {
      const safeSearch = escapeRegularExpression(rawSearch);

      clientQuery.$or = [
        {
          fullName: {
            $regex: safeSearch,
            $options: "i"
          }
        },
        {
          email: {
            $regex: safeSearch,
            $options: "i"
          }
        }
      ];
    }

    const skip = (page - 1) * limit;

    const [clientUsers, totalClients] = await Promise.all([
      User.find(clientQuery)
        .select(
          "_id fullName email isEmailVerified " +
          "twoFactorEnabled createdAt updatedAt"
        )
        .sort({
          createdAt: -1,
          _id: 1
        })
        .skip(skip)
        .limit(limit)
        .lean(),

      User.countDocuments(clientQuery)
    ]);

    const totalPages =
      totalClients === 0
        ? 0
        : Math.ceil(totalClients / limit);

    res.status(200).json({
      success: true,
      message: "Authorized client directory retrieved.",
      clients: clientUsers.map(
        buildSafeClientDirectoryEntry
      ),
      pagination: {
        page,
        limit,
        totalClients,
        totalPages,
        hasPreviousPage: page > 1,
        hasNextPage: page < totalPages
      },
      search: rawSearch
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message:
        "The client directory could not be retrieved."
    });
  }
});

/**
 * Sprint 2R.1
 * Executive Administrator-only full Tax Intake retrieval.
 *
 * Read-only.
 * No AWS S3 access.
 * No modifications to client submissions.
 */
router.get(
  "/clients/:clientId/tax-intakes",
  protect,
  requireExecutiveAdmin,
  async (req, res) => {
    res.setHeader(
      "Cache-Control",
      "private, no-store, max-age=0"
    );

    res.setHeader("Pragma", "no-cache");
    res.setHeader(
      "X-Content-Type-Options",
      "nosniff"
    );

    try {
      const { clientId } = req.params;

      if (!mongoose.isValidObjectId(clientId)) {
        return res.status(400).json({
          success: false,
          message:
            "A valid client identifier is required."
        });
      }

      const client = await User.findOne({
        _id: clientId,
        role: "client"
      })
        .select("_id fullName")
        .lean();

      if (!client) {
        return res.status(404).json({
          success: false,
          message:
            "The requested client record was not found."
        });
      }

      const intakeRecords = await TaxIntake.find({
        user: client._id
      })
        .select(
          "_id taxYear clientInformation " +
          "employmentTypes incomeSources " +
          "familyInformation businessInformation " +
          "servicesNeeded additionalNotes " +
          "status submittedAt createdAt updatedAt"
        )
        .sort({
          taxYear: -1,
          updatedAt: -1
        })
        .lean();

      const safeIntakes = intakeRecords.map(
        (intake) => ({
          id: intake._id,
          taxYear: intake.taxYear,
          clientInformation:
            intake.clientInformation,
          employmentTypes:
            intake.employmentTypes || [],
          incomeSources:
            intake.incomeSources || [],
          familyInformation:
            intake.familyInformation || [],
          businessInformation:
            intake.businessInformation || [],
          servicesNeeded:
            intake.servicesNeeded || [],
          additionalNotes:
            intake.additionalNotes || "",
          status: intake.status,
          submittedAt: intake.submittedAt,
          createdAt: intake.createdAt,
          updatedAt: intake.updatedAt
        })
      );

      return res.status(200).json({
        success: true,
        message:
          "Authorized client Tax Intake records retrieved.",
        client: {
          id: client._id,
          fullName: client.fullName
        },
        intakeCount: safeIntakes.length,
        intakes: safeIntakes
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message:
          "The client Tax Intake records could not be retrieved."
      });
    }
  }
);

/**
 * Sprint 2R.4B
 * Executive Administrator-only Tax Intake PDF download.
 * PDF generated directly from MongoDB without S3 storage.
 */
router.get(
  "/clients/:clientId/tax-intakes/:intakeId/pdf",
  protect,
  requireExecutiveAdmin,
  async (req, res) => {
    res.setHeader(
      "Cache-Control",
      "private, no-store, max-age=0"
    );
    res.setHeader("Pragma", "no-cache");
    res.setHeader("X-Content-Type-Options", "nosniff");

    try {
      const { clientId, intakeId } = req.params;

      if (
        !mongoose.isValidObjectId(clientId) ||
        !mongoose.isValidObjectId(intakeId)
      ) {
        return res.status(400).json({
          success: false,
          message: "A valid client and intake identifier is required."
        });
      }

      const client = await User.findOne({
        _id: clientId,
        role: "client"
      })
        .select("_id fullName")
        .lean();

      if (!client) {
        return res.status(404).json({
          success: false,
          message: "The requested client was not found."
        });
      }

      // Verify the intake belongs to the selected client.
      const intake = await TaxIntake.findOne({
        _id: intakeId,
        user: client._id
      }).lean();

      if (!intake) {
        return res.status(404).json({
          success: false,
          message: "The requested Tax Intake was not found."
        });
      }

      const pdf = new PDFDocument({
        size: "LETTER",
        margin: 50,
        bufferPages: false,
        info: {
          Title: "Mega Financial - Tax Intake",
          Author: "Mega Financial Tax Consulting",
          Subject: "Confidential Client Tax Intake"
        }
      });

      const formatValue = (value) => {
        if (Array.isArray(value)) {
          return value.length
            ? value.map(String).join(", ")
            : "None selected";
        }

        if (value === null || value === undefined) {
          return "Not provided";
        }

        if (typeof value === "object") {
          return JSON.stringify(value);
        }

        const result = String(value).trim();
        return result || "Not provided";
      };

      const formatDate = (value) => {
        if (!value) return "Not provided";

        const date = new Date(value);
        return Number.isNaN(date.getTime())
          ? "Not provided"
          : date.toISOString().slice(0, 10);
      };

      const addHeading = (heading) => {
        pdf.moveDown(0.8);
        pdf
          .font("Helvetica-Bold")
          .fontSize(12)
          .fillColor("#176B80")
          .text(heading, {
            keepTogether: true
          });

        pdf.moveDown(0.35);
      };

      const addField = (label, value) => {
        pdf
          .font("Helvetica-Bold")
          .fontSize(9)
          .fillColor("#333333")
          .text(`${label}:`, {
            continued: true
          });

        pdf
          .font("Helvetica")
          .fontSize(9)
          .fillColor("#333333")
          .text(` ${formatValue(value)}`);

        pdf.moveDown(0.25);
      };

      const info = intake.clientInformation || {};

      // PDF header
      pdf
        .font("Helvetica-Bold")
        .fontSize(18)
        .fillColor("#176B80")
        .text("MEGA FINANCIAL");

      pdf
        .font("Helvetica")
        .fontSize(11)
        .fillColor("#333333")
        .text("Confidential Client Tax Intake");

      pdf.moveDown(0.5);

      pdf
        .fontSize(8)
        .fillColor("#666666")
        .text(
          "Authorized Executive Administrator Use Only"
        );

      pdf.moveDown(0.5);

      addHeading("Intake Tracking");
      addField("Tax Year", intake.taxYear);
      addField("Status", intake.status);
      addField("Submitted", formatDate(intake.submittedAt));
      addField("Last Updated", formatDate(intake.updatedAt));

      addHeading("Client Information");
      addField("First Name", info.firstName);
      addField("Last Name", info.lastName);
      addField("Email", info.email);
      addField("Phone", info.phone);
      addField("Filing Status", info.filingStatus);

      addHeading("Employment Information");
      addField("Employment Types", intake.employmentTypes);

      addHeading("Income Information");
      addField("Income Sources", intake.incomeSources);

      addHeading("Family Information");
      addField("Family Details", intake.familyInformation);

      addHeading("Business Information");
      addField("Business Details", intake.businessInformation);

      addHeading("Requested Tax Services");
      addField("Services Needed", intake.servicesNeeded);

      addHeading("Additional Client Notes");
      addField("Notes", intake.additionalNotes);

      pdf.moveDown(1);

      pdf
        .font("Helvetica")
        .fontSize(8)
        .fillColor("#666666")
        .text(
          "Confidential tax information. Store and handle securely.",
          { align: "center" }
        );

      // Use a filename based on validated numeric tax year
      // and the database intake identifier.
      const year = Number.isInteger(intake.taxYear)
        ? intake.taxYear
        : "unknown";

      const filename =
        `MegaFinancial_TaxIntake_${year}_${intake._id}.pdf`;

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${filename}"`
      );
      res.setHeader(
        "X-Content-Type-Options",
        "nosniff"
      );

      // Stream directly to the authenticated response.
      // No file is saved locally or uploaded to S3.
      pdf.on("error", () => {
        if (!res.headersSent) {
          res.status(500).json({
            success: false,
            message: "PDF generation failed."
          });
        } else {
          res.destroy();
        }
      });

      pdf.pipe(res);
      pdf.end();
    } catch (error) {
      if (!res.headersSent) {
        return res.status(500).json({
          success: false,
          message: "The Tax Intake PDF could not be generated."
        });
      }

      res.destroy();
    }
  }
);

router.get(
  "/clients/:clientId/summary",
  protect,
  requireAdmin,
  async (req, res) => {
    try {
      const { clientId } = req.params;

      if (!mongoose.isValidObjectId(clientId)) {
        return res.status(400).json({
          success: false,
          message: "A valid client identifier is required."
        });
      }

      const clientUser = await User.findOne({
        _id: clientId,
        role: "client"
      })
        .select(
          "_id fullName email role isEmailVerified " +
          "twoFactorEnabled createdAt updatedAt"
        )
        .lean();

      if (!clientUser) {
        return res.status(404).json({
          success: false,
          message: "The requested client record was not found."
        });
      }

      const clientObjectId =
        new mongoose.Types.ObjectId(clientId);

      const [
        intakeSummaries,
        documentStatusGroups
      ] = await Promise.all([
        TaxIntake.find({
          user: clientObjectId
        })
          .select(
            "_id taxYear status submittedAt updatedAt"
          )
          .sort({
            taxYear: -1,
            updatedAt: -1
          })
          .lean(),

        DocumentMetadata.aggregate([
          {
            $match: {
              user: clientObjectId
            }
          },
          {
            $group: {
              _id: {
                taxYear: "$taxYear",
                uploadStatus: "$uploadStatus",
                reviewStatus: "$reviewStatus"
              },
              count: {
                $sum: 1
              }
            }
          },
          {
            $sort: {
              "_id.taxYear": -1,
              "_id.uploadStatus": 1,
              "_id.reviewStatus": 1
            }
          }
        ])
      ]);

      const taxYears = new Set();

      intakeSummaries.forEach((intake) => {
        taxYears.add(intake.taxYear);
      });

      documentStatusGroups.forEach((group) => {
        taxYears.add(group._id.taxYear);
      });

      const documentSummary = Array.from(taxYears)
        .sort((firstYear, secondYear) => {
          return secondYear - firstYear;
        })
        .map((taxYear) => {
          const matchingGroups =
            documentStatusGroups.filter((group) => {
              return group._id.taxYear === taxYear;
            });

          return {
            taxYear,
            totalMetadataRecords: matchingGroups.reduce(
              (total, group) => total + group.count,
              0
            ),
            statuses: matchingGroups.map((group) => {
              return {
                uploadStatus: group._id.uploadStatus,
                reviewStatus: group._id.reviewStatus,
                count: group.count
              };
            })
          };
        });

      res.status(200).json({
        success: true,
        message:
          "Authorized read-only client summary retrieved.",
        client: buildSafeClientAccountSummary(clientUser),
        intakeSummary: intakeSummaries.map((intake) => {
          return {
            id: intake._id,
            taxYear: intake.taxYear,
            status: intake.status,
            submittedAt: intake.submittedAt,
            updatedAt: intake.updatedAt
          };
        }),
        documentSummary
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message:
          "The client summary could not be retrieved."
      });
    }
  }
);

router.get(
  "/clients/:clientId/documents",
  protect,
  requireAdmin,
  async (req, res) => {
    try {
      const { clientId } = req.params;

      if (
        !mongoose.isValidObjectId(
          clientId
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "A valid client identifier is required."
        });
      }

      const clientExists =
        await User.exists({
          _id: clientId,
          role: "client"
        });

      if (!clientExists) {
        return res.status(404).json({
          success: false,
          message:
            "The requested client record was not found."
        });
      }

      const documents =
        await DocumentMetadata.find({
          user: clientId,
          uploadStatus: "stored"
        })
          .select(
            "_id taxYear checklistKey " +
            "originalFileName mimeType sizeBytes " +
            "uploadStatus reviewStatus uploadedAt"
          )
          .sort({
            uploadedAt: -1,
            _id: -1
          })
          .lean();

      return res.status(200).json({
        success: true,
        message:
          "Authorized client document review list retrieved.",
        count: documents.length,
        documents:
          documents.map(
            buildSafeAdminDocumentRecord
          )
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message:
          "The client document review list could not be retrieved."
      });
    }
  }
);

router.get(
  "/clients/:clientId/documents/:documentId/download",
  protect,
  requireAdmin,
  async (req, res) => {
    try {
      const {
        clientId,
        documentId
      } = req.params;

      if (
        !mongoose.isValidObjectId(clientId) ||
        !mongoose.isValidObjectId(documentId)
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Valid client and document identifiers are required."
        });
      }

      const documentRecord =
        await DocumentMetadata.findOne({
          _id: documentId,
          user: clientId,
          uploadStatus: "stored"
        })
          .select(
            "_id user originalFileName " +
            "storedFileName mimeType uploadStatus"
          )
          .lean();

      if (
        !documentRecord ||
        !documentRecord.storedFileName
      ) {
        return res.status(404).json({
          success: false,
          message:
            "The requested document is not available."
        });
      }

      const documentBuffer =
        await readPrivateDocument(
          documentRecord.storedFileName
        );

      const safeDownloadFileName =
        String(
          documentRecord
            .originalFileName ||
          "document"
        )
          .replace(/[\r\n"]/g, "")
          .trim() ||
        "document";

      res.setHeader(
        "Content-Type",
        documentRecord.mimeType
      );

      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${safeDownloadFileName}"`
      );

      res.setHeader(
        "Cache-Control",
        "private, no-store, max-age=0"
      );

      res.setHeader(
        "X-Content-Type-Options",
        "nosniff"
      );

      return res
        .status(200)
        .send(documentBuffer);
    } catch (error) {
      if (!res.headersSent) {
        return res.status(404).json({
          success: false,
          message:
            "The requested document is not available."
        });
      }
    }
  }
);

router.patch(
  "/clients/:clientId/documents/:documentId/review-status",
  protect,
  requireAdmin,
  async (req, res) => {
    try {
      const {
        clientId,
        documentId
      } = req.params;

      if (
        !mongoose.isValidObjectId(clientId) ||
        !mongoose.isValidObjectId(documentId)
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Valid client and document identifiers are required."
        });
      }

      const requestedStatus =
        typeof req.body.reviewStatus === "string"
          ? req.body.reviewStatus.trim()
          : "";

      const documentRecord =
        await DocumentMetadata.findOne({
          _id: documentId,
          user: clientId,
          uploadStatus: "stored"
        });

      if (!documentRecord) {
        return res.status(404).json({
          success: false,
          message:
            "The requested document is not available."
        });
      }

      const previousReviewStatus =
        documentRecord.reviewStatus;

      const allowedNextStatuses =
        REVIEW_STATUS_TRANSITIONS[
          previousReviewStatus
        ] || [];

      if (
        !allowedNextStatuses.includes(
          requestedStatus
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "The requested document review-status transition is not permitted."
        });
      }

      documentRecord.reviewStatus =
        requestedStatus;

      await documentRecord.save();

      await recordAdminAuditEvent({
        administratorId:
          req.user.id,

        administratorRole:
          req.user.role,

        clientId,

        action:
          "document_review_status_changed",

        resourceType:
          "document",

        resourceId:
          documentRecord._id,

        previousStatus:
          previousReviewStatus,

        newStatus:
          requestedStatus
      });

      return res.status(200).json({
        success: true,
        message:
          "Document review status updated.",
        document:
          buildSafeAdminDocumentRecord(
            documentRecord
          )
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message:
          "The document review status could not be updated."
      });
    }
  }
);

router.get(
  "/clients/:clientId/appointments",
  protect,
  requireAdmin,
  async (req, res) => {
    try {
      const { clientId } = req.params;

      if (
        !mongoose.isValidObjectId(
          clientId
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "A valid client identifier is required."
        });
      }

      const clientExists =
        await User.exists({
          _id: clientId,
          role: "client"
        });

      if (!clientExists) {
        return res.status(404).json({
          success: false,
          message:
            "The requested client record was not found."
        });
      }

      const appointments =
        await Appointment.find({
          user: clientId
        })
          .select(
            "_id serviceType platformType " +
            "appointmentStart durationMinutes " +
            "clientNotes status cancellationReason " +
            "cancelledAt confirmedAt completedAt " +
            "createdAt updatedAt"
          )
          .sort({
            appointmentStart: -1,
            _id: -1
          })
          .lean();

      return res.status(200).json({
        success: true,
        message:
          "Authorized client appointment list retrieved.",
        count: appointments.length,
        appointments:
          appointments.map(
            buildSafeAdminAppointmentRecord
          )
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message:
          "The client appointment list could not be retrieved."
      });
    }
  }
);

// Historical internal scheduling:
// Administrator appointment-status modifications are retired.
// Historical appointment records remain available for authorized viewing.

router.patch(
  "/clients/:clientId/appointments/:appointmentId/status",
  protect,
  requireAdmin,
  (req, res) => {
    return res.status(410).json({
      success: false,
      code: "INTERNAL_SCHEDULING_RETIRED",
      message:
        "Internal appointment-status management has been retired. " +
        "New bookings and scheduling changes are managed through " +
        "Mega Financial's external scheduling service.",
      schedulingPath: "/schedule.html"
    });
  }
);

router.get(
  "/clients/:clientId/messages",
  protect,
  requireAdmin,
  async (req, res) => {
    try {
      const { clientId } = req.params;

      if (
        !mongoose.isValidObjectId(
          clientId
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "A valid client identifier is required."
        });
      }

      const clientExists =
        await User.exists({
          _id: clientId,
          role: "client"
        });

      if (!clientExists) {
        return res.status(404).json({
          success: false,
          message:
            "The requested client record was not found."
        });
      }

      const limit =
        parseAdminMessageLimit(
          req.query.limit
        );

      const messages =
        await Message.find({
          client: clientId
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
              buildSafeAdminMessageRecord
            )
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message:
          "Client messages could not be retrieved."
      });
    }
  }
);

router.post(
  "/clients/:clientId/messages",
  protect,
  requireAdmin,
  async (req, res) => {
    try {
      const { clientId } = req.params;

      if (
        !mongoose.isValidObjectId(
          clientId
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "A valid client identifier is required."
        });
      }

      const clientExists =
        await User.exists({
          _id: clientId,
          role: "client"
        });

      if (!clientExists) {
        return res.status(404).json({
          success: false,
          message:
            "The requested client record was not found."
        });
      }

      const messageText =
        normalizeAdminMessageText(
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
          client: clientId,
          sender: req.user.id,
          senderRole: req.user.role,
          messageText
        });

      await Notification.create({
        user: clientId,
        type: "new_message",
        message:
          "You have a new secure message from Mega Financial.",
        relatedMessage:
          messageRecord._id
      });

      return res.status(201).json({
        success: true,
        message:
          "The secure client message was sent.",
        portalMessage:
          buildSafeAdminMessageRecord(
            messageRecord
          )
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message:
          "The client message could not be sent."
      });
    }
  }
);

module.exports = router;
