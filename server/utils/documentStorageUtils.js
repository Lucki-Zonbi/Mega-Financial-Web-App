const crypto = require("crypto");
const fs = require("fs/promises");
const path = require("path");

const {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client
} = require("@aws-sdk/client-s3");

const {
  ALLOWED_FILE_EXTENSIONS
} = require(
  "../middleware/documentUploadMiddleware"
);

const DOCUMENT_STORAGE_PROVIDERS =
  Object.freeze([
    "local",
    "s3"
  ]);

let s3Client = null;

function getDocumentStorageProvider() {
  const configuredProvider =
    typeof process.env
      .DOCUMENT_STORAGE_PROVIDER ===
      "string"
      ? process.env
          .DOCUMENT_STORAGE_PROVIDER
          .trim()
          .toLowerCase()
      : "";

  if (!configuredProvider) {
    if (
      process.env.NODE_ENV ===
      "production"
    ) {
      throw new Error(
        "DOCUMENT_STORAGE_PROVIDER must be configured in production."
      );
    }

    return "local";
  }

  if (
    !DOCUMENT_STORAGE_PROVIDERS.includes(
      configuredProvider
    )
  ) {
    throw new Error(
      "DOCUMENT_STORAGE_PROVIDER must be either local or s3."
    );
  }

  if (
    process.env.NODE_ENV ===
      "production" &&
    configuredProvider === "local"
  ) {
    throw new Error(
      "Local document storage is not permitted in production."
    );
  }

  return configuredProvider;
}

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

function getRequiredEnvironmentValue(
  name
) {
  const value =
    typeof process.env[name] ===
      "string"
      ? process.env[name].trim()
      : "";

  if (!value) {
    throw new Error(
      `${name} is required for S3 document storage.`
    );
  }

  return value;
}

function getS3Client() {
  if (s3Client) {
    return s3Client;
  }

  const region =
    getRequiredEnvironmentValue(
      "AWS_REGION"
    );

  const accessKeyId =
    getRequiredEnvironmentValue(
      "AWS_ACCESS_KEY_ID"
    );

  const secretAccessKey =
    getRequiredEnvironmentValue(
      "AWS_SECRET_ACCESS_KEY"
    );

  const sessionToken =
    typeof process.env
      .AWS_SESSION_TOKEN ===
      "string"
      ? process.env
          .AWS_SESSION_TOKEN
          .trim()
      : "";

  s3Client = new S3Client({
    region,

    credentials: {
      accessKeyId,
      secretAccessKey,

      ...(sessionToken
        ? {
            sessionToken
          }
        : {})
    }
  });

  return s3Client;
}

function getDocumentStorageBucket() {
  return getRequiredEnvironmentValue(
    "DOCUMENT_STORAGE_BUCKET"
  );
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

function validateStoredFileName(
  storedFileName
) {
  if (
    typeof storedFileName !==
      "string" ||
    !storedFileName ||
    path.basename(storedFileName) !==
      storedFileName
  ) {
    throw new Error(
      "Invalid private stored filename."
    );
  }

  return storedFileName;
}

function buildPrivateFilePath(
  storedFileName
) {
  const safeStoredFileName =
    validateStoredFileName(
      storedFileName
    );

  return path.join(
    getDocumentStorageDirectory(),
    safeStoredFileName
  );
}

function buildPrivateObjectKey(
  storedFileName
) {
  const safeStoredFileName =
    validateStoredFileName(
      storedFileName
    );

  return `documents/${safeStoredFileName}`;
}

async function storePrivateDocument({
  storedFileName,
  buffer,
  mimeType
}) {
  const provider =
    getDocumentStorageProvider();

  if (provider === "local") {
    const storageDirectory =
      await ensureDocumentStorageDirectory();

    const filePath = path.join(
      storageDirectory,
      validateStoredFileName(
        storedFileName
      )
    );

    await fs.writeFile(
      filePath,
      buffer,
      {
        flag: "wx"
      }
    );

    return storedFileName;
  }

  const client =
    getS3Client();

  const bucket =
    getDocumentStorageBucket();

  const objectKey =
    buildPrivateObjectKey(
      storedFileName
    );

  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: objectKey,
      Body: buffer,
      ContentType: mimeType,
      ServerSideEncryption:
        "AES256"
    })
  );

  return storedFileName;
}

async function readPrivateDocument(
  storedFileName
) {
  const provider =
    getDocumentStorageProvider();

  if (provider === "local") {
    return fs.readFile(
      buildPrivateFilePath(
        storedFileName
      )
    );
  }

  const client =
    getS3Client();

  const bucket =
    getDocumentStorageBucket();

  const response =
    await client.send(
      new GetObjectCommand({
        Bucket: bucket,

        Key:
          buildPrivateObjectKey(
            storedFileName
          )
      })
    );

  if (
    !response.Body ||
    typeof response.Body
      .transformToByteArray !==
      "function"
  ) {
    throw new Error(
      "The private document could not be read from storage."
    );
  }

  const bytes =
    await response.Body
      .transformToByteArray();

  return Buffer.from(bytes);
}

async function removePrivateDocument(
  storedFileName
) {
  if (!storedFileName) {
    return;
  }

  const provider =
    getDocumentStorageProvider();

  if (provider === "local") {
    const filePath =
      buildPrivateFilePath(
        storedFileName
      );

    try {
      await fs.unlink(filePath);
    } catch (error) {
      if (error.code !== "ENOENT") {
        throw error;
      }
    }

    return;
  }

  const client =
    getS3Client();

  const bucket =
    getDocumentStorageBucket();

  await client.send(
    new DeleteObjectCommand({
      Bucket: bucket,

      Key:
        buildPrivateObjectKey(
          storedFileName
        )
    })
  );
}

function validateDocumentStorageConfiguration() {
  const provider =
    getDocumentStorageProvider();

  if (provider === "s3") {
    getDocumentStorageBucket();
    getS3Client();
  }

  return provider;
}

module.exports = {
  getDocumentStorageProvider,
  getDocumentStorageDirectory,
  ensureDocumentStorageDirectory,
  getVerifiedFileType,
  generateStoredFileName,
  buildPrivateFilePath,
  buildPrivateObjectKey,
  storePrivateDocument,
  readPrivateDocument,
  removePrivateDocument,
  validateDocumentStorageConfiguration
};
