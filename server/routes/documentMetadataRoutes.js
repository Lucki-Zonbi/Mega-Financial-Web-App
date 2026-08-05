const express = require("express");

const protect = require(
  "../middleware/authMiddleware"
);

const {
  requireClient
} = require(
  "../middleware/roleAuthorizationMiddleware"
);

const DocumentMetadata = require(
  "../models/DocumentMetadata"
);

const TaxIntake = require(
  "../models/TaxIntake"
);

const {
  ALLOWED_DOCUMENT_CATEGORY_KEYS
} = require(
  "../constants/documentCategories"
);

const buildRequiredDocumentChecklist = require(
  "../utils/buildRequiredDocumentChecklist"
);

const router = express.Router();

const {
  ALLOWED_MIME_TYPES,
  MAX_DOCUMENT_SIZE_BYTES,
  sanitizeOriginalFileName
} = DocumentMetadata;

const FORBIDDEN_REQUEST_FIELDS = [
  "user",
  "userId",
  "clientId",
  "email",
  "owner",
  "ownerId",
  "storagePath",
  "storedFileName",
  "filePath",
  "path",
  "file",
  "fileBuffer",
  "buffer",
  "base64",
  "fileData",
  "documentData",
  "content"
];

function hasOwnProperty(object, property) {
  return Object.prototype.hasOwnProperty.call(
    object,
    property
  );
}

function findForbiddenRequestFields(body) {
  return FORBIDDEN_REQUEST_FIELDS.filter(
    (field) => hasOwnProperty(body, field)
  );
}

function parseAndValidateTaxYear(value) {
  const taxYear = Number(value);

  if (
    !Number.isInteger(taxYear) ||
    taxYear < 2000 ||
    taxYear > 2100
  ) {
    return null;
  }

  return taxYear;
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
      if (
        !req.is("application/json")
      ) {
        return res.status(415).json({
          success: false,
          message:
            "Document metadata drafts accept application/json only. No file was uploaded."
        });
      }

      if (
        !req.body ||
        typeof req.body !== "object" ||
        Array.isArray(req.body)
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Please provide valid JSON document metadata."
        });
      }

      const forbiddenFields =
        findForbiddenRequestFields(req.body);

      if (forbiddenFields.length > 0) {
        return res.status(400).json({
          success: false,
          message:
            "Ownership, storage paths, and file contents cannot be supplied by the client.",
          rejectedFields: forbiddenFields
        });
      }

      const {
        taxYear,
        checklistKey,
        originalFileName,
        mimeType,
        sizeBytes
      } = req.body;

      const parsedTaxYear =
        parseAndValidateTaxYear(taxYear);

      if (parsedTaxYear === null) {
        return res.status(400).json({
          success: false,
          message:
            "Please provide a valid tax year between 2000 and 2100."
        });
      }

      const normalizedChecklistKey =
        typeof checklistKey === "string"
          ? checklistKey.trim()
          : "";

      if (
        !normalizedChecklistKey ||
        !ALLOWED_DOCUMENT_CATEGORY_KEYS.includes(
          normalizedChecklistKey
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Please provide a valid document checklist key."
        });
      }

      const sanitizedOriginalFileName =
        sanitizeOriginalFileName(
          originalFileName
        );

      if (
        typeof sanitizedOriginalFileName !==
          "string" ||
        !sanitizedOriginalFileName ||
        sanitizedOriginalFileName.length > 255
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Please provide a valid original filename between 1 and 255 characters."
        });
      }

      const normalizedMimeType =
        typeof mimeType === "string"
          ? mimeType.trim().toLowerCase()
          : "";

      if (
        !ALLOWED_MIME_TYPES.includes(
          normalizedMimeType
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Only PDF, JPEG, and PNG MIME metadata is allowed."
        });
      }

      const parsedSizeBytes =
        Number(sizeBytes);

      if (
        !Number.isInteger(parsedSizeBytes) ||
        parsedSizeBytes < 1 ||
        parsedSizeBytes >
          MAX_DOCUMENT_SIZE_BYTES
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Document size metadata must be between 1 byte and 10 MB."
        });
      }

      const intake = await TaxIntake.findOne({
        user: req.user.id,
        taxYear: parsedTaxYear
      });

      if (!intake) {
        return res.status(404).json({
          success: false,
          message:
            "Complete the requested tax-year intake before preparing document metadata."
        });
      }

      const applicableChecklist =
        buildRequiredDocumentChecklist(intake);

      const applicableChecklistKeys =
        applicableChecklist.map(
          (category) => category.key
        );

      if (
        !applicableChecklistKeys.includes(
          normalizedChecklistKey
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "This document category is valid globally but is not required by your saved tax intake."
        });
      }

      const metadataDraft =
        await DocumentMetadata.create({
          user: req.user.id,
          taxYear: parsedTaxYear,
          checklistKey:
            normalizedChecklistKey,
          originalFileName:
            sanitizedOriginalFileName,
          storedFileName: null,
          mimeType: normalizedMimeType,
          sizeBytes: parsedSizeBytes,
          uploadStatus: "pending",
          reviewStatus: "not_reviewed",
          uploadedAt: null
        });

      return res.status(201).json({
        success: true,
        message:
          "Document metadata was prepared successfully. No file was uploaded or stored.",
        metadataDraft
      });
    } catch (error) {
      console.error(
        "Document metadata draft creation error:",
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
          "Something went wrong while preparing the document metadata. No file was uploaded."
      });
    }
  }
);

router.get(
  "/",
  protect,
  requireClient,
  async (req, res) => {
    try {
      const query = {
        user: req.user.id
      };

      if (
        req.query.taxYear !== undefined
      ) {
        const parsedTaxYear =
          parseAndValidateTaxYear(
            req.query.taxYear
          );

        if (parsedTaxYear === null) {
          return res.status(400).json({
            success: false,
            message:
              "Please provide a valid tax-year filter between 2000 and 2100."
          });
        }

        query.taxYear = parsedTaxYear;
      }

      const metadataDrafts =
        await DocumentMetadata.find(query)
          .sort({
            createdAt: -1,
            _id: -1
          });

      if (metadataDrafts.length === 0) {
        return res.status(200).json({
          success: true,
          message:
            "No pending document metadata drafts were found. This does not indicate that any files were uploaded.",
          count: 0,
          metadataDrafts: []
        });
      }

      return res.status(200).json({
        success: true,
        message:
          "Pending document metadata drafts retrieved successfully. These records do not represent uploaded files.",
        count: metadataDrafts.length,
        metadataDrafts
      });
    } catch (error) {
      console.error(
        "Document metadata retrieval error:",
        error.message
      );

      return res.status(500).json({
        success: false,
        message:
          "Something went wrong while retrieving document metadata drafts."
      });
    }
  }
);

module.exports = router;
