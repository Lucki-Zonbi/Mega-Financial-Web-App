const mongoose = require("mongoose");

async function connectDB() {
  try {
    const mongoUri = process.env.MONGODB_URI;

    if (!mongoUri) {
      console.error("MONGODB_URI is missing from .env");
      process.exit(1);
    }

    await mongoose.connect(mongoUri);

    console.log("MongoDB Atlas connected successfully.");
  } catch (error) {
    console.error("MongoDB connection failed:", error.message);
    process.exit(1);
  }
}

module.exports = connectDB;
