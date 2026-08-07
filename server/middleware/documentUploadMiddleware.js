const multer = require("multer");
const path = require("path");

const DocumentMetadata = require(
  "../models/DocumentMetadata"
);

const {
  ALLOWED_MIME_TYPES,
  MAX_DOCUMENT_SIZE_BYTES
} = DocumentMetadata;

const ALLOWED_FILE_EXTENSIONS = Object.freeze([
  ".pdf",
  ".jpg",
  ".jpeg",
  ".png"
]);

function getNormalizedExtension(fileName) {
  if (typeof fileName !== "string") {
    return "";
  }

  return path.extname(fileName).toLowerCase();
}

function documentFileFilter(req, file, callback) {
  const extension =
    getNormalizedExtension(file.originalname);

  if (
    !ALLOWED_FILE_EXTENSIONS.includes(extension)
  ) {
    return callback(
      new multer.MulterError(
        "LIMIT_UNEXPECTED_FILE",
        "document"
      )
    );
  }

  if (
    !ALLOWED_MIME_TYPES.includes(
      String(file.mimetype || "").toLowerCase()
    )
  ) {
    return callback(
      new multer.MulterError(
        "LIMIT_UNEXPECTED_FILE",
        "document"
      )
    );
  }

  callback(null, true);
}

const uploadDocument = multer({
  storage: multer.memoryStorage(),

  limits: {
    files: 1,
    fileSize: MAX_DOCUMENT_SIZE_BYTES
  },

  fileFilter: documentFileFilter
}).single("document");

module.exports = {
  uploadDocument,
  ALLOWED_FILE_EXTENSIONS,
  getNormalizedExtension
};
