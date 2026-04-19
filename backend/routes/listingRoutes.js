const express = require("express");
const { getListings, createListing, getMyListings, deleteListing } = require("../controllers/listingController");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/", getListings);
router.post("/", authMiddleware, createListing);
router.get("/me", authMiddleware, getMyListings);
router.delete("/:id", authMiddleware, deleteListing);

module.exports = router;
