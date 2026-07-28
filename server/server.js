const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const path = require("path");
require("dotenv").config();
const connectDB = require("./config/db");
const { apiLimiter, authLimiter } = require("./middleware/rateLimitMiddleware");

connectDB();

const app = express();
const authRoutes = require("./routes/authRoutes");
const clientRoutes = require("./routes/clientRoutes");
const intakeRoutes = require("./routes/intakeRoutes");

const documentMetadataRoutes = require(
  "./routes/documentMetadataRoutes"
);

app.use(
  helmet({
    contentSecurityPolicy: false
  })
);

app.use(cors());

app.use(express.json({ limit: "100kb" }));
app.use(express.urlencoded({ extended: true, limit: "100kb" }));

app.use("/api", apiLimiter);
app.use("/api/auth", authLimiter, authRoutes);
app.use("/api/client", clientRoutes);
app.use("/api/intake", intakeRoutes);
app.use("/api/document-metadata", documentMetadataRoutes);
app.use(express.static(path.join(__dirname, "../public")));

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

app.listen(PORT, () => {
  console.log(`Mega Financial Web App running on port ${PORT}`);
});
