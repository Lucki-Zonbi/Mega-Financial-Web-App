
const express = require("express");
const mongoose = require("mongoose");
const crypto = require("crypto");

const protect = require("../middleware/authMiddleware");

const {
  requireAdmin,
  requireClient
} = require("../middleware/roleAuthorizationMiddleware");

const Invoice = require("../models/Invoice");
const User = require("../models/User");

const router = express.Router();

const MAX_LINE_ITEMS = 50;
const MAX_INVOICE_TOTAL_CENTS = 100000000;

function isPlainObject(value) {
  return (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    Object.getPrototypeOf(value) === Object.prototype
  );
}

function hasOnlyFields(object, allowedFields) {
  return Object.keys(object).every((key) =>
    allowedFields.includes(key)
  );
}

function isValidObjectId(value) {
  return (
    typeof value === "string" &&
    mongoose.isObjectIdOrHexString(value)
  );
}

function parseLineItems(items) {
  if (
    !Array.isArray(items) ||
    items.length === 0 ||
    items.length > MAX_LINE_ITEMS
  ) {
    return null;
  }

  const normalizedItems = [];
  let total = 0;

  for (const item of items) {
    if (
      !isPlainObject(item) ||
      !hasOnlyFields(item, [
        "description",
        "quantity",
        "unitAmountCents"
      ])
    ) {
      return null;
    }

    const {
      description,
      quantity,
      unitAmountCents
    } = item;

    if (
      typeof description !== "string" ||
      description.trim().length < 1 ||
      description.trim().length > 250 ||
      !Number.isInteger(quantity) ||
      quantity < 1 ||
      quantity > 1000 ||
      !Number.isSafeInteger(unitAmountCents) ||
      unitAmountCents < 0 ||
      unitAmountCents > 100000000
    ) {
      return null;
    }

    const lineTotal = quantity * unitAmountCents;

    if (
      !Number.isSafeInteger(lineTotal) ||
      lineTotal > MAX_INVOICE_TOTAL_CENTS
    ) {
      return null;
    }

    total += lineTotal;

    if (
      !Number.isSafeInteger(total) ||
      total > MAX_INVOICE_TOTAL_CENTS
    ) {
      return null;
    }

    normalizedItems.push({
      description: description.trim(),
      quantity,
      unitAmountCents
    });
  }

  if (total <= 0) {
    return null;
  }

  return {
    lineItems: normalizedItems,
    amountTotalCents: total
  };
}

function createInvoiceNumber() {
  return [
    "MF",
    Date.now().toString(36).toUpperCase(),
    crypto.randomBytes(8).toString("hex").toUpperCase()
  ].join("-");
}

function serializeInvoice(invoice) {
  return {
    id: String(invoice._id),
    invoiceNumber: invoice.invoiceNumber,
    client: String(invoice.client),
    issuedBy: String(invoice.issuedBy),
    lineItems: invoice.lineItems.map((item) => ({
      description: item.description,
      quantity: item.quantity,
      unitAmountCents: item.unitAmountCents
    })),
    amountTotalCents: invoice.amountTotalCents,
    currency: invoice.currency,
    status: invoice.status,
    issuedAt: invoice.issuedAt,
    dueAt: invoice.dueAt,
    paidAt: invoice.paidAt,
    voidedAt: invoice.voidedAt,
    createdAt: invoice.createdAt,
    updatedAt: invoice.updatedAt
  };
}

// All invoice endpoints require authentication.
router.use(protect);

// POST /api/invoices/admin/drafts
// Administrator creates a draft for an existing client.
router.post(
  "/admin/drafts",
  requireAdmin,
  async (req, res) => {
    try {
      const body = req.body;

      if (
        !isPlainObject(body) ||
        !hasOnlyFields(body, [
          "clientId",
          "lineItems"
        ])
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid invoice request fields."
        });
      }

      if (!isValidObjectId(body.clientId)) {
        return res.status(400).json({
          success: false,
          message: "A valid client ID is required."
        });
      }

      const parsed = parseLineItems(body.lineItems);

      if (!parsed) {
        return res.status(400).json({
          success: false,
          message: "Invalid invoice line items or total."
        });
      }

      const client = await User.findOne({
        _id: body.clientId,
        role: "client"
      }).select("_id");

      if (!client) {
        return res.status(404).json({
          success: false,
          message: "Client account not found."
        });
      }

      const invoice = await Invoice.create({
        invoiceNumber: createInvoiceNumber(),
        client: client._id,
        issuedBy: req.user.id,
        lineItems: parsed.lineItems,
        amountTotalCents: parsed.amountTotalCents,
        currency: "usd",
        status: "draft"
      });

      return res.status(201).json({
        success: true,
        message: "Draft invoice created.",
        invoice: serializeInvoice(invoice)
      });
    } catch (error) {
      console.error("Invoice draft creation failed:", error);

      return res.status(500).json({
        success: false,
        message: "Unable to create the draft invoice."
      });
    }
  }
);

// GET /api/invoices/admin
// Administrators can review draft and existing invoices.
router.get(
  "/admin",
  requireAdmin,
  async (req, res) => {
    try {
      const invoices = await Invoice.find({})
        .sort({ createdAt: -1 })
        .limit(50)
        .lean();

      return res.status(200).json({
        success: true,
        invoices: invoices.map(serializeInvoice)
      });
    } catch (error) {
      console.error("Invoice admin listing failed:", error);

      return res.status(500).json({
        success: false,
        message: "Unable to retrieve invoices."
      });
    }
  }
);

// GET /api/invoices/admin/:invoiceId
// Administrators can inspect a particular invoice.
router.get(
  "/admin/:invoiceId",
  requireAdmin,
  async (req, res) => {
    try {
      if (!isValidObjectId(req.params.invoiceId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid invoice ID."
        });
      }

      const invoice = await Invoice.findById(
        req.params.invoiceId
      ).lean();

      if (!invoice) {
        return res.status(404).json({
          success: false,
          message: "Invoice not found."
        });
      }

      return res.status(200).json({
        success: true,
        invoice: serializeInvoice(invoice)
      });
    } catch (error) {
      console.error("Invoice detail retrieval failed:", error);

      return res.status(500).json({
        success: false,
        message: "Unable to retrieve the invoice."
      });
    }
  }
);

// ==================================================
// PHASE 2 — ADMINISTRATOR INVOICE LIFECYCLE
// ==================================================

// PATCH /api/invoices/admin/:invoiceId/draft
// Update line items only while the invoice is a draft.
router.patch(
  "/admin/:invoiceId/draft",
  requireAdmin,
  async (req, res) => {
    try {
      const { invoiceId } = req.params;

      if (!isValidObjectId(invoiceId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid invoice ID."
        });
      }

      if (
        !isPlainObject(req.body) ||
        !hasOnlyFields(req.body, ["lineItems"]) ||
        !Object.prototype.hasOwnProperty.call(
          req.body,
          "lineItems"
        )
      ) {
        return res.status(400).json({
          success: false,
          message: "Only draft line items may be updated."
        });
      }

      const parsed = parseLineItems(req.body.lineItems);

      if (!parsed) {
        return res.status(400).json({
          success: false,
          message: "Invalid invoice line items or total."
        });
      }

      const invoice = await Invoice.findOneAndUpdate(
        {
          _id: invoiceId,
          status: "draft"
        },
        {
          $set: {
            lineItems: parsed.lineItems,
            amountTotalCents: parsed.amountTotalCents
          }
        },
        {
          new: true,
          runValidators: true
        }
      );

      if (!invoice) {
        return res.status(409).json({
          success: false,
          message:
            "Invoice not found or is no longer editable."
        });
      }

      return res.status(200).json({
        success: true,
        message: "Draft invoice updated.",
        invoice: serializeInvoice(invoice)
      });
    } catch (error) {
      console.error("Draft invoice update failed:", error);

      return res.status(500).json({
        success: false,
        message: "Unable to update the draft invoice."
      });
    }
  }
);

// POST /api/invoices/admin/:invoiceId/issue
// Issue a finalized draft invoice.
router.post(
  "/admin/:invoiceId/issue",
  requireAdmin,
  async (req, res) => {
    try {
      const { invoiceId } = req.params;

      if (!isValidObjectId(invoiceId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid invoice ID."
        });
      }

      if (
        req.body == null ||
        !isPlainObject(req.body) ||
        Object.keys(req.body).length !== 0
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invoice issuance does not accept request fields."
        });
      }

      const issuedAt = new Date();

      const invoice = await Invoice.findOneAndUpdate(
        {
          _id: invoiceId,
          status: "draft",
          amountTotalCents: { $gt: 0 }
        },
        {
          $set: {
            status: "issued",
            issuedAt
          }
        },
        {
          new: true,
          runValidators: true
        }
      );

      if (!invoice) {
        return res.status(409).json({
          success: false,
          message:
            "Invoice not found or cannot be issued."
        });
      }

      return res.status(200).json({
        success: true,
        message: "Invoice issued successfully.",
        invoice: serializeInvoice(invoice)
      });
    } catch (error) {
      console.error("Invoice issuance failed:", error);

      return res.status(500).json({
        success: false,
        message: "Unable to issue the invoice."
      });
    }
  }
);

// POST /api/invoices/admin/:invoiceId/void
// Void a draft or issued invoice that has not been paid.
router.post(
  "/admin/:invoiceId/void",
  requireAdmin,
  async (req, res) => {
    try {
      const { invoiceId } = req.params;

      if (!isValidObjectId(invoiceId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid invoice ID."
        });
      }

      if (
        req.body == null ||
        !isPlainObject(req.body) ||
        Object.keys(req.body).length !== 0
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invoice voiding does not accept request fields."
        });
      }

      const invoice = await Invoice.findOneAndUpdate(
        {
          _id: invoiceId,
          status: { $in: ["draft", "issued"] },
          paidAt: null
        },
        {
          $set: {
            status: "void",
            voidedAt: new Date()
          }
        },
        {
          new: true,
          runValidators: true
        }
      );

      if (!invoice) {
        return res.status(409).json({
          success: false,
          message:
            "Invoice not found or cannot be voided."
        });
      }

      return res.status(200).json({
        success: true,
        message: "Invoice voided successfully.",
        invoice: serializeInvoice(invoice)
      });
    } catch (error) {
      console.error("Invoice void operation failed:", error);

      return res.status(500).json({
        success: false,
        message: "Unable to void the invoice."
      });
    }
  }
);

// ==================================================
// END PHASE 2 ADMINISTRATOR INVOICE LIFECYCLE
// ==================================================

// GET /api/invoices/mine
// Clients can see only their own non-draft invoices.
router.get(
  "/mine",
  requireClient,
  async (req, res) => {
    try {
      const invoices = await Invoice.find({
        client: req.user.id,
        status: {
          $in: ["issued", "paid"]
        }
      })
        .sort({ createdAt: -1 })
        .limit(50)
        .lean();

      return res.status(200).json({
        success: true,
        invoices: invoices.map(serializeInvoice)
      });
    } catch (error) {
      console.error("Client invoice listing failed:", error);

      return res.status(500).json({
        success: false,
        message: "Unable to retrieve your invoices."
      });
    }
  }
);

module.exports = router;
