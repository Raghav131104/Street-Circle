const Listing = require("../models/Listing");

// Helper to calculate distance in km using Haversine formula
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const p = 0.017453292519943295; // Math.PI / 180
  const c = Math.cos;
  const a = 0.5 - c((lat2 - lat1) * p)/2 + 
          c(lat1 * p) * c(lat2 * p) * 
          (1 - c((lon2 - lon1) * p))/2;

  return 12742 * Math.asin(Math.sqrt(a)); // 2 * R; R = 6371 km
};

exports.getListings = async (req, res) => {
  try {
    const { lat, lng, radius, type } = req.query;
    
    // Build query object based on filter
    const query = {};
    if (type && type !== "all") {
      query.type = type;
    }

    // Fetch listings from DB
    const listings = await Listing.find(query).populate("author", "username").sort({ createdAt: -1 });

    // Filter by radius if location is provided
    if (lat && lng && radius) {
      const userLat = parseFloat(lat);
      const userLng = parseFloat(lng);
      const radiusLimit = parseFloat(radius);

      const filteredListings = listings.filter((listing) => {
        const distance = calculateDistance(
          userLat,
          userLng,
          listing.location.lat,
          listing.location.lng
        );
        // Add distance to the returned object so frontend can display it
        listing._doc.distance = distance;
        return distance <= radiusLimit;
      });

      return res.status(200).json(filteredListings);
    }

    res.status(200).json(listings);
  } catch (error) {
    console.error("Error fetching listings:", error);
    res.status(500).json({ error: "Failed to fetch listings" });
  }
};

exports.createListing = async (req, res) => {
  try {
    const { title, description, type, price, location, image } = req.body;
    
    const newListing = new Listing({
      title,
      description,
      type,
      price,
      location,
      image,
      author: req.user.id
    });

    const savedListing = await newListing.save();
    
    // After creating, let's also pass distance back (assume 0 if new/local)
    // Actually, usually creation just returns the object
    res.status(201).json(savedListing);
  } catch (error) {
    console.error("Error creating listing:", error);
    res.status(500).json({ error: "Failed to create listing" });
  }
};

exports.getMyListings = async (req, res) => {
  try {
    const listings = await Listing.find({ author: req.user.id }).sort({ createdAt: -1 });
    res.status(200).json(listings);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch user listings" });
  }
};

exports.deleteListing = async (req, res) => {
  try {
    const listing = await Listing.findById(req.params.id);
    if (!listing) return res.status(404).json({ error: "Listing not found" });

    // Ensure only author can delete
    if (listing.author.toString() !== req.user.id) {
      return res.status(403).json({ error: "Unauthorized to delete this listing" });
    }

    await listing.deleteOne();
    res.status(200).json({ message: "Listing deleted" });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete listing" });
  }
};
