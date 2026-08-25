const express = require("express");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const User =
  require("../models/User");

const {
  accountSecurityLimiter
} = require(
  "../middleware/rateLimitMiddleware"
);

const {
  createEmailVerificationToken,
  createPasswordResetToken,
  hashAccountSecurityToken
} = require(
  "../utils/accountSecurityUtils"
);

const {
  sendEmailVerificationMessage,
  sendPasswordResetMessage
} = require(
  "../utils/accountEmailUtils"
);

const router =
  express.Router();

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

router.post("/register", async (req, res) => {
  try {
    const { fullName, email, phone, password, confirmPassword } = req.body;

    if (!fullName || !email || !phone || !password || !confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "Please complete all required registration fields."
      });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "Password and confirm password must match."
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 8 characters."
      });
    }

    const normalizedEmail = normalizeEmail(email);

    const existingUser = await User.findOne({ email: normalizedEmail });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "An account with this email already exists."
      });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const verification =
      createEmailVerificationToken();

    const user =
      await User.create({
        fullName,
        email:
          normalizedEmail,
        phone,
        passwordHash,
        role:
          "client",

        emailVerificationTokenHash:
          verification.tokenHash,

        emailVerificationTokenExpiresAt:
          verification.expiresAt,

        emailVerificationRequestedAt:
          new Date()
      });

    let verificationEmailSent =
      true;

    try {
      await sendEmailVerificationMessage({
        email:
          user.email,

        fullName:
          user.fullName,

        token:
          verification.token
      });
    } catch (emailError) {
      verificationEmailSent =
        false;

      console.error(
        "Registration verification email error:",
        emailError.message
      );
    }

    return res.status(201).json({
      success:
        true,

      message:
        verificationEmailSent
          ? "Client account created successfully. Check your email to verify your address."
          : "Client account created successfully. Verification email delivery is temporarily unavailable; you can request another verification email later.",
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        phone: user.phone,
        role: user.role,
        isEmailVerified: user.isEmailVerified,
        twoFactorEnabled: user.twoFactorEnabled,
        createdAt: user.createdAt
      },
      futureSecurityFeatures: [
        "Email and SMS two-factor authentication",
        "SMS verification",
        "Administrator re-verification"
      ]
    });
  } catch (error) {
    console.error("Registration error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Something went wrong while creating the account."
    });
  }
});

router.post(
  "/bootstrap-executive-admin",
  async (req, res) => {
    try {
      const bootstrapEnabled =
        process.env.ADMIN_BOOTSTRAP_ENABLED === "true";

      const configuredBootstrapKey =
        String(
          process.env.ADMIN_BOOTSTRAP_KEY || ""
        );

      const suppliedBootstrapKey =
        String(
          req.get("X-Admin-Bootstrap-Key") || ""
        );

      if (
        process.env.NODE_ENV === "production" ||
        !bootstrapEnabled ||
        !configuredBootstrapKey
      ) {
        return res.status(404).json({
          success: false,
          message:
            "The requested resource is not available."
        });
      }

      const configuredKeyBuffer =
        Buffer.from(
          configuredBootstrapKey,
          "utf8"
        );

      const suppliedKeyBuffer =
        Buffer.from(
          suppliedBootstrapKey,
          "utf8"
        );

      const bootstrapKeyMatches =
        configuredKeyBuffer.length ===
          suppliedKeyBuffer.length &&
        crypto.timingSafeEqual(
          configuredKeyBuffer,
          suppliedKeyBuffer
        );

      if (!bootstrapKeyMatches) {
        return res.status(403).json({
          success: false,
          message:
            "Administrator bootstrap authorization failed."
        });
      }

      const {
        fullName,
        email,
        phone,
        password,
        confirmPassword
      } = req.body;

      if (
        !fullName ||
        !email ||
        !phone ||
        !password ||
        !confirmPassword
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Please complete all required administrator fields."
        });
      }

      if (password !== confirmPassword) {
        return res.status(400).json({
          success: false,
          message:
            "Password and confirm password must match."
        });
      }

      if (password.length < 12) {
        return res.status(400).json({
          success: false,
          message:
            "Administrator passwords must be at least 12 characters."
        });
      }

      const normalizedEmail =
        normalizeEmail(email);

      const existingUser =
        await User.findOne({
          email: normalizedEmail
        });

      if (existingUser) {
        return res.status(409).json({
          success: false,
          message:
            "An account with this email already exists."
        });
      }

      const passwordHash =
        await bcrypt.hash(
          password,
          12
        );

      const user =
        await User.create({
          fullName:
            String(fullName).trim(),
          email:
            normalizedEmail,
          phone:
            String(phone).trim(),
          passwordHash,
          role:
            "executive_admin"
        });

      return res.status(201).json({
        success: true,
        message:
          "Executive administrator account created successfully.",
        user: {
          id:
            user._id,
          fullName:
            user.fullName,
          email:
            user.email,
          role:
            user.role,
          createdAt:
            user.createdAt
        }
      });
    } catch (error) {
      console.error(
        "Executive administrator bootstrap error:",
        error.message
      );

      return res.status(500).json({
        success: false,
        message:
          "The administrator account could not be created."
      });
    }
  }
);

router.post(
  "/request-email-verification",
  accountSecurityLimiter,
  async (req, res) => {
    const genericMessage =
      "If an eligible account exists for that email, a verification message will be sent.";

    try {
      const normalizedEmail =
        normalizeEmail(
          req.body.email
        );

      if (!normalizedEmail) {
        return res
          .status(400)
          .json({
            success:
              false,

            message:
              "Please enter your email address."
          });
      }

      const user =
        await User.findOne({
          email:
            normalizedEmail
        });

      if (
        !user ||
        user.isEmailVerified
      ) {
        return res
          .status(200)
          .json({
            success:
              true,

            message:
              genericMessage
          });
      }

      const verification =
        createEmailVerificationToken();

      user.emailVerificationTokenHash =
        verification.tokenHash;

      user.emailVerificationTokenExpiresAt =
        verification.expiresAt;

      user.emailVerificationRequestedAt =
        new Date();

      await user.save();

      try {
        await sendEmailVerificationMessage({
          email:
            user.email,

          fullName:
            user.fullName,

          token:
            verification.token
        });
      } catch (emailError) {
        console.error(
          "Verification email delivery error:",
          emailError.message
        );
      }

      return res
        .status(200)
        .json({
          success:
            true,

          message:
            genericMessage
        });
    } catch (error) {
      console.error(
        "Verification request error:",
        error.message
      );

      return res
        .status(500)
        .json({
          success:
            false,

          message:
            "The verification request could not be processed."
        });
    }
  }
);

router.post(
  "/verify-email",
  accountSecurityLimiter,
  async (req, res) => {
    try {
      const token =
        String(
          req.body.token || ""
        ).trim();

      if (!token) {
        return res
          .status(400)
          .json({
            success:
              false,

            message:
              "The email verification link is invalid or expired."
          });
      }

      const tokenHash =
        hashAccountSecurityToken(
          token
        );

      const user =
        await User.findOneAndUpdate(
          {
            emailVerificationTokenHash:
              tokenHash,

            emailVerificationTokenExpiresAt: {
              $gt:
                new Date()
            }
          },

          {
            $set: {
              isEmailVerified:
                true,

              emailVerificationTokenHash:
                null,

              emailVerificationTokenExpiresAt:
                null
            }
          },

          {
            new:
              true
          }
        );

      if (!user) {
        return res
          .status(400)
          .json({
            success:
              false,

            message:
              "The email verification link is invalid or expired."
          });
      }

      return res
        .status(200)
        .json({
          success:
            true,

          message:
            "Email address verified successfully."
        });
    } catch (error) {
      console.error(
        "Email verification error:",
        error.message
      );

      return res
        .status(500)
        .json({
          success:
            false,

          message:
            "The email address could not be verified."
        });
    }
  }
);

router.post(
  "/forgot-password",
  accountSecurityLimiter,
  async (req, res) => {
    const genericMessage =
      "If an account exists for that email, password reset instructions will be sent.";

    try {
      const normalizedEmail =
        normalizeEmail(
          req.body.email
        );

      if (!normalizedEmail) {
        return res
          .status(400)
          .json({
            success:
              false,

            message:
              "Please enter your email address."
          });
      }

      const user =
        await User.findOne({
          email:
            normalizedEmail
        });

      if (!user) {
        return res
          .status(200)
          .json({
            success:
              true,

            message:
              genericMessage
          });
      }

      const reset =
        createPasswordResetToken();

      user.passwordResetTokenHash =
        reset.tokenHash;

      user.passwordResetTokenExpiresAt =
        reset.expiresAt;

      user.passwordResetRequestedAt =
        new Date();

      await user.save();

      try {
        await sendPasswordResetMessage({
          email:
            user.email,

          fullName:
            user.fullName,

          token:
            reset.token
        });
      } catch (emailError) {
        console.error(
          "Password reset email delivery error:",
          emailError.message
        );
      }

      return res
        .status(200)
        .json({
          success:
            true,

          message:
            genericMessage
        });
    } catch (error) {
      console.error(
        "Forgot password request error:",
        error.message
      );

      return res
        .status(500)
        .json({
          success:
            false,

          message:
            "The password reset request could not be processed."
        });
    }
  }
);

router.post(
  "/reset-password",
  accountSecurityLimiter,
  async (req, res) => {
    try {
      const token =
        String(
          req.body.token || ""
        ).trim();

      const password =
        String(
          req.body.password || ""
        );

      const confirmPassword =
        String(
          req.body.confirmPassword || ""
        );

      if (
        !token ||
        !password ||
        !confirmPassword
      ) {
        return res
          .status(400)
          .json({
            success:
              false,

            message:
              "Please complete all password reset fields."
          });
      }

      if (
        password !==
        confirmPassword
      ) {
        return res
          .status(400)
          .json({
            success:
              false,

            message:
              "Password and confirm password must match."
          });
      }

      const tokenHash =
        hashAccountSecurityToken(
          token
        );

      const user =
        await User.findOne({
          passwordResetTokenHash:
            tokenHash,

          passwordResetTokenExpiresAt: {
            $gt:
              new Date()
          }
        });

      if (!user) {
        return res
          .status(400)
          .json({
            success:
              false,

            message:
              "The password reset link is invalid or expired."
          });
      }

      const minimumPasswordLength =
        user.role === "client"
          ? 8
          : 12;

      if (
        password.length <
        minimumPasswordLength
      ) {
        return res
          .status(400)
          .json({
            success:
              false,

            message:
              `Password must be at least ${minimumPasswordLength} characters.`
          });
      }

      const passwordHash =
        await bcrypt.hash(
          password,
          12
        );

      const passwordChangedAt =
        new Date();

      const updatedUser =
        await User.findOneAndUpdate(
          {
            _id:
              user._id,

            passwordResetTokenHash:
              tokenHash,

            passwordResetTokenExpiresAt: {
              $gt:
                new Date()
            }
          },

          {
            $set: {
              passwordHash,

              passwordChangedAt,

              passwordResetTokenHash:
                null,

              passwordResetTokenExpiresAt:
                null
            }
          },

          {
            new:
              true
          }
        );

      if (!updatedUser) {
        return res
          .status(400)
          .json({
            success:
              false,

            message:
              "The password reset link is invalid or expired."
          });
      }

      return res
        .status(200)
        .json({
          success:
            true,

          message:
            "Password reset successfully. Please log in with your new password."
        });
    } catch (error) {
      console.error(
        "Password reset error:",
        error.message
      );

      return res
        .status(500)
        .json({
          success:
            false,

          message:
            "The password could not be reset."
        });
    }
  }
);


router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Please enter your email and password."
      });
    }

    const normalizedEmail = normalizeEmail(email);

    const user = await User.findOne({ email: normalizedEmail }).select("+passwordHash");

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password."
      });
    }

    const passwordMatches = await bcrypt.compare(password, user.passwordHash);

    if (!passwordMatches) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password."
      });
    }

    if (!process.env.JWT_SECRET) {
      return res.status(500).json({
        success: false,
        message: "Server authentication configuration is missing."
      });
    }

    const token = jwt.sign(
      {
        id: user._id,
        email: user.email,
        role: user.role
      },
      process.env.JWT_SECRET,
      {
        expiresIn: process.env.JWT_EXPIRES_IN || "1d"
      }
    );

    return res.status(200).json({
      success: true,
      message: "Login successful.",
      token,
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        phone: user.phone,
        role: user.role,
        isEmailVerified: user.isEmailVerified,
        twoFactorEnabled: user.twoFactorEnabled
      }
    });
  } catch (error) {
    console.error("Login error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Something went wrong while logging in."
    });
  }
});

router.post("/logout", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Logout placeholder. Frontend token cleanup will be connected in a future sprint."
  });
});

module.exports = router;
