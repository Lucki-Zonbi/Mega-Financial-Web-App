const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const path = require("path");
require("dotenv").config();
const connectDB = require("./config/db");
const { apiLimiter, authLimiter } = require("./middleware/rateLimitMiddleware");

const {
  validateDocumentStorageConfiguration
} = require(
  "./utils/documentStorageUtils"
);

validateDocumentStorageConfiguration();
connectDB();

const app = express();
const authRoutes = require("./routes/authRoutes");
const clientRoutes = require("./routes/clientRoutes");
const adminRoutes = require("./routes/adminRoutes");
const intakeRoutes = require("./routes/intakeRoutes");
const messageRoutes = require("./routes/messageRoutes");

const notificationRoutes = require(
  "./routes/notificationRoutes"
);

const appointmentRoutes = require(
  "./routes/appointmentRoutes"
);

const documentMetadataRoutes = require(
  "./routes/documentMetadataRoutes"
);

const {
  paymentRoutes,
  handleStripeWebhook
} = require(
  "./routes/paymentRoutes"
);

app.use(
  helmet({
    contentSecurityPolicy: false
  })
);

const allowedOrigins = new Set(
  [
    process.env.FRONTEND_ORIGIN,
    "http://localhost:3000",
    "http://127.0.0.1:3000"
  ].filter(Boolean)
);

app.use(
  cors({
    origin(origin, callback) {
      if (
        !origin ||
        allowedOrigins.has(origin)
      ) {
        callback(null, true);
        return;
      }

      callback(
        new Error(
          "Origin is not allowed by the Mega Financial API."
        )
      );
    },

    methods: [
      "GET",
      "POST",
      "PATCH",
      "OPTIONS"
    ],

    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-Admin-Bootstrap-Key"
    ]
  })
);

app.post(
  "/api/payments/webhook",
  apiLimiter,
  express.raw({
    type:
      "application/json"
  }),
  handleStripeWebhook
);

app.use(express.json({
    limit:"100kb"})
);

app.use(  express.urlencoded({
    extended: true, limit:"100kb"})
);

app.use("/api/auth", authLimiter, authRoutes);
app.use("/api/client", clientRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/intake", intakeRoutes);
app.use("/api/messages", messageRoutes);

app.use(
  "/api/notifications",
  notificationRoutes
);

app.use(
  "/api/appointments",
  appointmentRoutes
);

app.use(
  "/api/document-metadata",
  documentMetadataRoutes
);

app.use(
  "/api/payments",
  paymentRoutes
);

app.use(
  express.static(
    path.join(
      __dirname,
      "../public"
    )
  )
);

app.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Mega Financial Web App API is running",
  });
});

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../public/index.html"));
});

const PORT = process.env.PORT || 3000;

app.listen(
  PORT,
  "0.0.0.0",
  () => {
    console.log(
      `Mega Financial Web App running on port ${PORT}`
    );
  }
);
