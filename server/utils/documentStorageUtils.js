const crypto = require("crypto");
const fs = require("fs/promises");
const path = require("path");

const {
  ALLOWED_FILE_EXTENSIONS
} = require(
  "../middleware/documentUploadMiddleware"
);

function getDocumentStorageDirectory() {
  const configuredDirectory =
    typeof process.env.DOCUMENT_STORAGE_DIR === "string"
      ? process.env.DOCUMENT_STORAGE_DIR.trim()
      : "";

  const requestedDirectory =
    configuredDirectory ||
    path.join(
      process.cwd(),
      "private-uploads"
    );

  return path.resolve(requestedDirectory);
}

async function ensureDocumentStorageDirectory() {
  const storageDirectory =
    getDocumentStorageDirectory();

  await fs.mkdir(storageDirectory, {
    recursive: true
  });

  return storageDirectory;
}

function getVerifiedFileType(buffer) {
  if (!Buffer.isBuffer(buffer)) {
    return null;
  }

  const isPdf =
    buffer.length >= 5 &&
    buffer.subarray(0, 5).toString("ascii") ===
      "%PDF-";

  if (isPdf) {
    return {
      mimeType: "application/pdf",
      allowedExtensions: [".pdf"],
      storedExtension: ".pdf"
    };
  }

  const isJpeg =
    buffer.length >= 3 &&
    buffer[0] === 0xff &&
    buffer[1] === 0xd8 &&
    buffer[2] === 0xff;

  if (isJpeg) {
    return {
      mimeType: "image/jpeg",
      allowedExtensions: [".jpg", ".jpeg"],
      storedExtension: ".jpg"
    };
  }

  const pngSignature = Buffer.from([
    0x89,
    0x50,
    0x4e,
    0x47,
    0x0d,
    0x0a,
    0x1a,
    0x0a
  ]);

  const isPng =
    buffer.length >= pngSignature.length &&
    buffer
      .subarray(0, pngSignature.length)
      .equals(pngSignature);

  if (isPng) {
    return {
      mimeType: "image/png",
      allowedExtensions: [".png"],
      storedExtension: ".png"
    };
  }

  return null;
}

function generateStoredFileName(extension) {
  const normalizedExtension =
    typeof extension === "string"
      ? extension.toLowerCase()
      : "";

  if (
    !ALLOWED_FILE_EXTENSIONS.includes(
      normalizedExtension
    )
  ) {
    throw new Error(
      "A supported stored-file extension is required."
    );
  }

  return `${crypto.randomUUID()}${normalizedExtension}`;
}

function buildPrivateFilePath(storedFileName) {
  const safeStoredFileName =
    path.basename(storedFileName);

  if (
    safeStoredFileName !== storedFileName
  ) {
    throw new Error(
      "Invalid private stored filename."
    );
  }

  return path.join(
    getDocumentStorageDirectory(),
    safeStoredFileName
  );
}

async function storePrivateDocument({
  storedFileName,
  buffer
}) {
  const storageDirectory =
    await ensureDocumentStorageDirectory();

  const filePath = path.join(
    storageDirectory,
    path.basename(storedFileName)
  );

  await fs.writeFile(
    filePath,
    buffer,
    {
      flag: "wx"
    }
  );

  return filePath;
}

async function removePrivateDocument(
  storedFileName
) {
  if (!storedFileName) {
    return;
  }

  const filePath =
    buildPrivateFilePath(storedFileName);

  try {
    await fs.unlink(filePath);
  } catch (error) {
    if (error.code !== "ENOENT") {
      throw error;
    }
  }
}

module.exports = {
  getDocumentStorageDirectory,
  ensureDocumentStorageDirectory,
  getVerifiedFileType,
  generateStoredFileName,
  buildPrivateFilePath,
  storePrivateDocument,
  removePrivateDocument
};
