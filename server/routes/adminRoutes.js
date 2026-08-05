const express = require("express");
const protect = require("../middleware/authMiddleware");

const {
  requireAdmin
} = require("../middleware/roleAuthorizationMiddleware");

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

module.exports = router;
