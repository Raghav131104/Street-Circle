const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();
const listingRoutes = require("./routes/listingRoutes");
const authRoutes = require("./routes/authRoutes");
const app = express();
app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use("/api/listings", listingRoutes);
app.use("/api/auth", authRoutes);
app.get("/api/health", (_req, res) => res.json({ ok: true, storage: mongoose.connection.readyState === 1 ? "mongodb" : "local" }));
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/streetcircle";
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 4000 })
  .then(() => console.log("Connected to MongoDB"))
  .catch((error) => console.warn(`MongoDB unavailable (${error.message}). Using persistent local development storage.`));
