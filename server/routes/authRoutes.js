const express = require("express");
const bcrypt = require("bcryptjs");
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

router.post("/login", (req, res) => {
  res.status(200).json({
    success: false,
    message: "Login route placeholder. Real JWT login will be added in a future sprint."
  });
});

router.post("/logout", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Logout placeholder. Frontend token cleanup will be connected in a future sprint."
  });
});

module.exports = router;
