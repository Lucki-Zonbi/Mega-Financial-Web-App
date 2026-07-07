const express = require("express");
const cors = require("cors");
const path = require("path");
require("dotenv").config();
const connectDB = require("./config/db");

connectDB();

const app = express();
const authRoutes = require("./routes/authRoutes");

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/api/auth", authRoutes);

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
