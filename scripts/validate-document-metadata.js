const mongoose = require("mongoose");

const DocumentMetadata = require(
  "../server/models/DocumentMetadata"
);

function getValidationMessages(error) {
  if (!error || !error.errors) {
    return [];
  }

  return Object.values(error.errors).map(
    (item) => item.message
  );
}

function runValidation(
  name,
  metadata,
  expectedToPass
) {
  const document = new DocumentMetadata(metadata);

  const error = document.validateSync();

  const passed = !error;

  console.log(`\n${name}`);
  console.log(
    `Expected: ${expectedToPass ? "valid" : "invalid"}`
  );
  console.log(
    `Result: ${passed ? "valid" : "invalid"}`
  );

  if (error) {
    console.log(
      "Validation messages:",
      getValidationMessages(error)
    );
  }

  if (passed !== expectedToPass) {
    throw new Error(
      `${name} did not produce the expected validation result.`
    );
  }

  return document;
}

const validUserId =
  new mongoose.Types.ObjectId();

const validDocument = runValidation(
  "1. Valid metadata",
  {
    user: validUserId,
    taxYear: 2026,
    checklistKey: "w2_forms",
    originalFileName:
      "C:\\Users\\Client\\Documents\\2026-W2.pdf",
    mimeType: "application/pdf",
    sizeBytes: 250000
  },
  true
);

console.log(
  "Sanitized original filename:",
  validDocument.originalFileName
);

if (
  validDocument.originalFileName !==
  "2026-W2.pdf"
) {
  throw new Error(
    "Original filename path information was not removed."
  );
}

runValidation(
  "2. Invalid checklist key",
  {
    user: validUserId,
    taxYear: 2026,
    checklistKey: "arbitrary_private_document",
    originalFileName: "document.pdf",
    mimeType: "application/pdf",
    sizeBytes: 1000
  },
  false
);

runValidation(
  "3. Invalid tax year",
  {
    user: validUserId,
    taxYear: 1999,
    checklistKey: "w2_forms",
    originalFileName: "document.pdf",
    mimeType: "application/pdf",
    sizeBytes: 1000
  },
  false
);

runValidation(
  "4. Missing authenticated owner",
  {
    taxYear: 2026,
    checklistKey: "w2_forms",
    originalFileName: "document.pdf",
    mimeType: "application/pdf",
    sizeBytes: 1000
  },
  false
);

runValidation(
  "5. Invalid MIME type",
  {
    user: validUserId,
    taxYear: 2026,
    checklistKey: "w2_forms",
    originalFileName: "document.exe",
    mimeType: "application/x-msdownload",
    sizeBytes: 1000
  },
  false
);

runValidation(
  "6. Oversized metadata",
  {
    user: validUserId,
    taxYear: 2026,
    checklistKey: "w2_forms",
    originalFileName: "large.pdf",
    mimeType: "application/pdf",
    sizeBytes: 10 * 1024 * 1024 + 1
  },
  false
);

console.log("\nDeclared schema indexes:");

console.log(
  DocumentMetadata.schema.indexes()
);

console.log(
  "\nValidation complete. No database connection was opened and no file was uploaded or stored."
);
