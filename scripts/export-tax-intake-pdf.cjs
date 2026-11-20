
require("dotenv").config();

const fs = require("node:fs");
const path = require("node:path");
const mongoose = require("mongoose");
const PDFDocument = require("pdfkit");

const TaxIntake = require("../server/models/TaxIntake");

function display(value) {
  if (Array.isArray(value)) {
    return value.length ? value.join(", ") : "None provided";
  }

  if (value === null || value === undefined || value === "") {
    return "Not provided";
  }

  return String(value);
}

function writeField(pdf, label, value) {
  pdf.font("Helvetica-Bold").fontSize(10).text(label);
  pdf.font("Helvetica").fontSize(10).text(display(value));
  pdf.moveDown(0.6);
}

function writeSection(pdf, title) {
  pdf.moveDown(0.4);
  pdf.font("Helvetica-Bold").fontSize(13).text(title);
  pdf.moveDown(0.5);
}

async function main() {
  const intakeId = process.argv[2];
  const uri = process.env.MONGODB_URI;
  const outputDir = process.env.TAX_INTAKE_EXPORT_DIR;

  if (!mongoose.isValidObjectId(intakeId)) {
    throw new Error("Provide a valid tax intake ObjectId.");
  }

  if (!uri || !outputDir) {
    throw new Error(
      "MONGODB_URI and TAX_INTAKE_EXPORT_DIR are required."
    );
  }

  const resolvedDir = path.resolve(outputDir);
  const projectRoot = path.resolve(__dirname, "..");
  const relative = path.relative(projectRoot, resolvedDir);

  if (
    relative === "" ||
    (!relative.startsWith("..") && !path.isAbsolute(relative))
  ) {
    throw new Error("Export directory must be outside the project.");
  }

  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 10000
  });

  const intake = await TaxIntake.findById(intakeId)
    .lean()
    .exec();

  if (!intake) {
    throw new Error("Tax intake record not found.");
  }

  fs.mkdirSync(resolvedDir, {
    recursive: true,
    mode: 0o700
  });

  const timestamp = new Date()
    .toISOString()
    .replace(/[:.]/g, "-");

  const filename =
    `tax-intake-${intakeId}-${timestamp}.pdf`;

  const destination = path.join(resolvedDir, filename);

  const pdf = new PDFDocument({
    size: "LETTER",
    margin: 50,
    info: {
      Title: "Mega Financial Tax Intake Summary",
      Author: "Mega Financial"
    }
  });

  const output = fs.createWriteStream(destination, {
    flags: "wx",
    mode: 0o600
  });

  const completed = new Promise((resolve, reject) => {
    output.on("finish", resolve);
    output.on("error", reject);
    pdf.on("error", reject);
  });

  pdf.pipe(output);

  pdf.font("Helvetica-Bold")
    .fontSize(18)
    .text("MEGA FINANCIAL");

  pdf.font("Helvetica")
    .fontSize(14)
    .text("Tax Intake Summary");

  pdf.moveDown();
  pdf.fontSize(9).text(
    "Confidential client information — internal use only"
  );

  pdf.moveDown();
  writeField(pdf, "Tax Year", intake.taxYear);
  writeField(pdf, "Intake Record ID", intake._id);
  writeField(pdf, "Client User ID", intake.user);
  writeField(pdf, "Status", intake.status);
  writeField(pdf, "Submitted At", intake.submittedAt);
  writeField(pdf, "Exported At", new Date().toISOString());

  writeSection(pdf, "Client Information");

  const info = intake.clientInformation || {};

  writeField(pdf, "First Name", info.firstName);
  writeField(pdf, "Last Name", info.lastName);
  writeField(pdf, "Email", info.email);
  writeField(pdf, "Phone", info.phone);
  writeField(pdf, "Filing Status", info.filingStatus);

  writeSection(pdf, "Tax Intake Selections");

  writeField(pdf, "Employment Types", intake.employmentTypes);
  writeField(pdf, "Income Sources", intake.incomeSources);
  writeField(pdf, "Family Information", intake.familyInformation);
  writeField(pdf, "Business Information", intake.businessInformation);
  writeField(pdf, "Services Needed", intake.servicesNeeded);

  writeSection(pdf, "Additional Notes");
  writeField(pdf, "Client Notes", intake.additionalNotes);

  pdf.moveDown();
  pdf.fontSize(9).text(
    "This document is a snapshot of submitted intake information. " +
    "It is not a filed tax return or an official IRS form."
  );

  pdf.end();
  await completed;

  console.log("PDF generated successfully.");
  console.log("Saved to:", destination);
}

main()
  .catch((error) => {
    console.error("Export failed:", error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
