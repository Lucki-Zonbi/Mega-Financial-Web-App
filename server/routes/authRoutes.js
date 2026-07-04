const express = require("express");

const router = express.Router();

router.post("/register", (req, res) => {
  const { fullName, email, phone } = req.body;

  res.status(200).json({
    success: false,
    message: "Registration route placeholder. Real account creation will be added in a future sprint.",
    receivedFields: {
      fullName: Boolean(fullName),
      email: Boolean(email),
      phone: Boolean(phone)
    }
  });
});

router.post("/login", (req, res) => {
  const { email } = req.body;

  res.status(200).json({
    success: false,
    message: "Login route placeholder. Real authentication will be added in a future sprint.",
    receivedFields: {
      email: Boolean(email)
    }
  });
});

router.post("/logout", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Logout placeholder. Frontend token cleanup will be connected in a future sprint."
  });
});

module.exports = router;
