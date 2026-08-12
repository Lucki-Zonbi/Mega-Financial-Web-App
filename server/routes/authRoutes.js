const express = require("express");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const User = require("../models/User");

const router = express.Router();

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

    const user = await User.create({
      fullName,
      email: normalizedEmail,
      phone,
      passwordHash,
      role: "client"
    });

    return res.status(201).json({
      success: true,
      message: "Client account created successfully. Login will be activated in a future sprint.",
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
        "JWT login tied to unique user ID",
        "Client portal protected routes",
        "Email and SMS two-factor authentication",
        "Forgot password/email recovery",
        "Admin role access controls",
        "API rate limiting"
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
