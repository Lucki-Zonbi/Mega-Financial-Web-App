const jwt = require("jsonwebtoken");
const User = require("../models/User");

async function protect(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Access denied. Please log in first."
      });
    }

    const token = authHeader.split(" ")[1];

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

       const user =
      await User
        .findById(
          decoded.id
        )
        .select(
          "-passwordHash"
        );

    if (!user) {
      return res.status(401).json({
        success:
          false,

        message:
          "User account no longer exists."
      });
    }

    if (
      user.passwordChangedAt &&
      decoded.iat
    ) {
      const passwordChangedAtSeconds =
        Math.floor(
          user
            .passwordChangedAt
            .getTime() /
            1000
        );

      if (
        decoded.iat <
        passwordChangedAtSeconds
      ) {
        return res.status(401).json({
          success:
            false,

          message:
            "Session expired after a password change. Please log in again."
        });
      }
    }

    req.user = {
      id: user._id,
      fullName: user.fullName,
      email: user.email,
      phone: user.phone,
      role: user.role,
      isEmailVerified: user.isEmailVerified,
      twoFactorEnabled: user.twoFactorEnabled
    };

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Session expired or invalid. Please log in again."
    });
  }
}

module.exports = protect;
