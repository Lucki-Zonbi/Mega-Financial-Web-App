const mongoose = require("mongoose");
const crypto = require("crypto");
const express = require("express");

const protect = require(
  "../middleware/authMiddleware"
);

const {
  requireClient
} = require(
  "../middleware/roleAuthorizationMiddleware"
);

const PolicyAcknowledgement =
  require(
    "../models/PolicyAcknowledgement"
  );

const {
  POLICY_VERSIONS,
  POLICY_TYPES
} = require(
  "../constants/policyVersions"
);

const {
  storePolicyAcknowledgementDocument
} = require(
  "../utils/documentStorageUtils"
);

const {
  buildPolicyAcknowledgementDocument,
  hashPolicyAcknowledgementDocument
} = require(
  "../utils/policyAcknowledgementUtils"
);

const router = express.Router();

const ACKNOWLEDGEMENT_TEXT =
  Object.freeze({
    privacy_policy:
      "I acknowledge that I have read the Mega Financial Privacy Policy.",

    cookie_data_notice:
      "I acknowledge that I have read the Mega Financial Cookie & Data Collection Notice."
  });

function buildPolicyStatus(
  acknowledgements
) {
  const acknowledgementMap =
    new Map();

  acknowledgements.forEach(
    (record) => {
      const key =
        `${record.policyType}:${record.policyVersion}`;

      acknowledgementMap.set(
        key,
        record
      );
    }
  );

  const policies =
    POLICY_TYPES.map(
      (policyType) => {
        const currentPolicy =
          POLICY_VERSIONS[
            policyType
          ];

        const key =
          `${policyType}:${currentPolicy.version}`;

        const acknowledgement =
          acknowledgementMap.get(
            key
          );

        return {
          policyType,
          title:
            currentPolicy.title,
          version:
            currentPolicy.version,
          acknowledged:
            Boolean(
              acknowledgement
            ),
          acknowledgedAt:
            acknowledgement
              ? acknowledgement
                  .acknowledgedAt
              : null
        };
      }
    );

  return {
    policies,
    allCurrentPoliciesAcknowledged:
      policies.every(
        (policy) =>
          policy.acknowledged
      )
  };
}

router.get(
  "/current",
  protect,
  requireClient,
  async (req, res) => {
    try {
      const acknowledgements =
        await PolicyAcknowledgement
          .find({
            user: req.user.id
          })
          .select(
            "policyType policyVersion acknowledgedAt"
          )
          .lean();

      return res.status(200).json({
        success: true,
        ...buildPolicyStatus(
          acknowledgements
        )
      });
    } catch (error) {
      console.error(
        "Policy status error:",
        error.message
      );

      return res.status(500).json({
        success: false,
        message:
          "Unable to retrieve policy acknowledgement status."
      });
    }
  }
);

router.post(
  "/acknowledge",
  protect,
  requireClient,
  async (req, res) => {
    try {
      const requestedPolicyTypes =
        Array.isArray(
          req.body.policyTypes
        )
          ? req.body.policyTypes
          : [];

      const uniquePolicyTypes =
        [
          ...new Set(
            requestedPolicyTypes
          )
        ];

      if (
        uniquePolicyTypes.length ===
          0 ||
        uniquePolicyTypes.some(
          (policyType) =>
            !POLICY_TYPES.includes(
              policyType
            )
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Please acknowledge the current Mega Financial policies."
        });
      }

      const results = [];

      for (
        const policyType of
        uniquePolicyTypes
      ) {
        const policy =
          POLICY_VERSIONS[
            policyType
          ];

        const existingRecord =
          await PolicyAcknowledgement
            .findOne({
              user:
                req.user.id,
              policyType,
              policyVersion:
                policy.version
            });

        if (existingRecord) {
          results.push({
            policyType,
            policyVersion:
              policy.version,
            acknowledgedAt:
              existingRecord
                .acknowledgedAt,
            alreadyAcknowledged:
              true
          });

          continue;
        }

        const acknowledgementObjectId =
         new mongoose.Types.ObjectId();

        const acknowledgementId =
         acknowledgementObjectId.toString();

        const acknowledgedAt =
          new Date();

        const acknowledgementText =
          ACKNOWLEDGEMENT_TEXT[
            policyType
          ];

        const documentBuffer =
          buildPolicyAcknowledgementDocument({
            acknowledgementId,
            user:
              req.user,
            policyType,
            policyTitle:
              policy.title,
            policyVersion:
              policy.version,
            acknowledgementText,
            acknowledgedAt
          });

        const documentHash =
          hashPolicyAcknowledgementDocument(
            documentBuffer
          );

        const documentKey =
          await storePolicyAcknowledgementDocument({
            userId:
              String(
                req.user.id
              ),
            acknowledgementId,
            buffer:
              documentBuffer
          });

        const acknowledgement =
          await PolicyAcknowledgement
            .create({
              _id:
                acknowledgementObjectId,
              user:
                req.user.id,
              policyType,
              policyVersion:
                policy.version,
              policyTitle:
                policy.title,
              acknowledgementText,
              acknowledgedAt,
              acknowledgementDocumentKey:
                documentKey,
              acknowledgementDocumentHash:
                documentHash
            });

        results.push({
          policyType,
          policyVersion:
            policy.version,
          acknowledgedAt:
            acknowledgement
              .acknowledgedAt,
          alreadyAcknowledged:
            false
        });
      }

      const allAcknowledgements =
        await PolicyAcknowledgement
          .find({
            user:
              req.user.id
          })
          .select(
            "policyType policyVersion acknowledgedAt"
          )
          .lean();

      return res.status(201).json({
        success: true,
        message:
          "Policy acknowledgement recorded successfully.",
        acknowledgements:
          results,
        ...buildPolicyStatus(
          allAcknowledgements
        )
      });
    } catch (error) {
      console.error(
        "Policy acknowledgement error:",
        error.message
      );

      if (
        error &&
        error.code === 11000
      ) {
        return res.status(409).json({
          success: false,
          message:
            "This policy version has already been acknowledged."
        });
      }

      return res.status(500).json({
        success: false,
        message:
          "Unable to securely record the policy acknowledgement."
      });
    }
  }
);

module.exports = router;
