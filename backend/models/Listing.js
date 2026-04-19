const mongoose = require("mongoose");

const listingSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String, required: true },
    type: { type: String, required: true, enum: ["item", "skill"] },
    price: { type: Number, default: 0 },
    // For MVP phase 1, we use basic lat, lng numbers. 
    // In Phase 4, GeoJSON could be used for advanced maps.
    location: {
      lat: { type: Number, required: true },
      lng: { type: Number, required: true },
    },
    image: { type: String, required: false },
    author: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  },
  { 
    timestamps: true,
    collection: 'sc_listings'
  }
);

module.exports = mongoose.model("Listing", listingSchema);
