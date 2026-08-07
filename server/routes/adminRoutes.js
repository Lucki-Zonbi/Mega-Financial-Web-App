const express = require("express");
const mongoose = require("mongoose");
const protect = require("../middleware/authMiddleware");

const {
  requireAdmin
} = require("../middleware/roleAuthorizationMiddleware");

const User = require("../models/User");
const TaxIntake = require("../models/TaxIntake");
const DocumentMetadata = require("../models/DocumentMetadata");

const {
  DEFAULT_ADMIN_CLIENT_LIMIT,
  MAX_ADMIN_CLIENT_LIMIT,
  escapeRegularExpression,
  parseBoundedPositiveInteger,
  buildSafeClientDirectoryEntry,
  buildSafeClientAccountSummary
} = require("../utils/adminClientViewUtils");

const router = express.Router();

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

module.exports = router;
