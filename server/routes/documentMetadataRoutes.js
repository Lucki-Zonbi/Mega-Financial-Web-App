const express = require("express");
const path = require("path");

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

const {
  uploadDocument
} = require(
  "../middleware/documentUploadMiddleware"
);

const {
  getVerifiedFileType,
  generateStoredFileName,
  storePrivateDocument,
  removePrivateDocument
} = require(
  "../utils/documentStorageUtils"
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

function buildSafeDocumentStatus(documentRecord) {
  return {
    id: documentRecord._id,
    taxYear: documentRecord.taxYear,
    checklistKey: documentRecord.checklistKey,
    originalFileName:
      documentRecord.originalFileName,
    mimeType: documentRecord.mimeType,
    sizeBytes: documentRecord.sizeBytes,
    uploadStatus:
      documentRecord.uploadStatus,
    reviewStatus:
      documentRecord.reviewStatus,
    uploadedAt:
      documentRecord.uploadedAt,
    createdAt:
      documentRecord.createdAt,
    updatedAt:
      documentRecord.updatedAt
  };
}

function handleDocumentUploadMiddleware(
  req,
  res,
  next
) {
  uploadDocument(req, res, (error) => {
    if (!error) {
      next();
      return;
    }

    if (error.code === "LIMIT_FILE_SIZE") {
      res.status(400).json({
        success: false,
        message:
          "The selected document exceeds the 10 MB upload limit."
      });

      return;
    }

    res.status(400).json({
      success: false,
      message:
        "Only one PDF, JPEG, or PNG document may be uploaded."
    });
  });
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

router.post(
  "/upload",
  protect,
  requireClient,
  handleDocumentUploadMiddleware,
  async (req, res) => {
    let storedFileName = null;

    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message:
            "Please select one PDF, JPEG, or PNG document."
        });
      }

      const parsedTaxYear =
        parseAndValidateTaxYear(
          req.body.taxYear
        );

      if (parsedTaxYear === null) {
        return res.status(400).json({
          success: false,
          message:
            "Please provide a valid tax year between 2000 and 2100."
        });
      }

      const normalizedChecklistKey =
        typeof req.body.checklistKey === "string"
          ? req.body.checklistKey.trim()
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
            "Please select a valid document category."
        });
      }

      const forbiddenOwnershipFields = [
        "user",
        "userId",
        "clientId",
        "owner",
        "ownerId",
        "storedFileName",
        "storagePath",
        "filePath"
      ].filter((field) => {
        return hasOwnProperty(req.body, field);
      });

      if (
        forbiddenOwnershipFields.length > 0
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Ownership and private storage information cannot be supplied by the client."
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
            "Complete the requested tax-year intake before uploading documents."
        });
      }

      const applicableChecklist =
        buildRequiredDocumentChecklist(intake);

      const categoryIsRequired =
        applicableChecklist.some(
          (category) => {
            return (
              category.key ===
              normalizedChecklistKey
            );
          }
        );

      if (!categoryIsRequired) {
        return res.status(400).json({
          success: false,
          message:
            "The selected document category is not required by your saved tax intake."
        });
      }

      const sanitizedOriginalFileName =
        sanitizeOriginalFileName(
          req.file.originalname
        );

      if (
        !sanitizedOriginalFileName ||
        sanitizedOriginalFileName.length > 255
      ) {
        return res.status(400).json({
          success: false,
          message:
            "The selected document filename is invalid."
        });
      }

      const originalExtension =
        path
          .extname(sanitizedOriginalFileName)
          .toLowerCase();

      const verifiedFileType =
        getVerifiedFileType(
          req.file.buffer
        );

      if (!verifiedFileType) {
        return res.status(400).json({
          success: false,
          message:
            "The document contents do not match a supported PDF, JPEG, or PNG file."
        });
      }

      if (
        !verifiedFileType.allowedExtensions.includes(
          originalExtension
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "The document extension does not match the detected file type."
        });
      }

      const reportedMimeType =
        String(
          req.file.mimetype || ""
        ).toLowerCase();

      if (
        reportedMimeType !==
        verifiedFileType.mimeType
      ) {
        return res.status(400).json({
          success: false,
          message:
            "The reported document type does not match the detected file contents."
        });
      }

      storedFileName =
        generateStoredFileName(
          verifiedFileType.storedExtension
        );

      await storePrivateDocument({
        storedFileName,
        buffer: req.file.buffer
      });

      let documentRecord;

      try {
        documentRecord =
          await DocumentMetadata.create({
            user: req.user.id,
            taxYear: parsedTaxYear,
            checklistKey:
              normalizedChecklistKey,
            originalFileName:
              sanitizedOriginalFileName,
            storedFileName,
            mimeType:
              verifiedFileType.mimeType,
            sizeBytes:
              req.file.size,
            uploadStatus: "stored",
            reviewStatus: "not_reviewed",
            uploadedAt: new Date()
          });
      } catch (databaseError) {
        await removePrivateDocument(
          storedFileName
        );

        storedFileName = null;

        throw databaseError;
      }

      return res.status(201).json({
        success: true,
        message:
          "Your document was securely uploaded and is awaiting review.",
        document:
          buildSafeDocumentStatus(
            documentRecord
          )
      });
    } catch (error) {
      console.error(
        "Secure document upload error:",
        error.message
      );

      if (storedFileName) {
        try {
          await removePrivateDocument(
            storedFileName
          );
        } catch (cleanupError) {
          console.error(
            "Private document cleanup error:",
            cleanupError.message
          );
        }
      }

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
          "The document could not be securely stored."
      });
    }
  }
);

router.get(
  "/status",
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
              "Please provide a valid tax year between 2000 and 2100."
          });
        }

        query.taxYear = parsedTaxYear;
      }

      const documents =
        await DocumentMetadata.find(query)
          .select(
            "_id taxYear checklistKey " +
            "originalFileName mimeType sizeBytes " +
            "uploadStatus reviewStatus uploadedAt " +
            "createdAt updatedAt"
          )
          .sort({
            createdAt: -1,
            _id: -1
          })
          .lean();

      return res.status(200).json({
        success: true,
        message:
          "Protected document statuses retrieved.",
        count: documents.length,
        documents
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message:
          "Document statuses could not be retrieved."
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
