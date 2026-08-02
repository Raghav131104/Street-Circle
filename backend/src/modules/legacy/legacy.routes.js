const express = require("express");
const bcrypt = require("bcryptjs");

function distanceInKm(lat1, lng1, lat2, lng2) {
  const toRadians = (value) => value * Math.PI / 180;
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2))
    * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function createLegacyRouter(db) {
  const router = express.Router();

  router.post("/register", async (req, res) => {
    const { username, password, email, phone } = req.body;
    if (!username || !password || !email || !phone) return res.status(400).json({ error: "All fields are required" });
    const [existing] = await db.execute("SELECT id FROM users WHERE username = ?", [username]);
    if (existing.length) return res.status(400).json({ error: "Username already exists" });
    const passwordHash = await bcrypt.hash(password, 10);
    const [result] = await db.execute(
      "INSERT INTO users (username, password, email, phone) VALUES (?, ?, ?, ?)",
      [username, passwordHash, email, phone],
    );
    return res.status(201).json({ user: { id: result.insertId, username } });
  });

  router.post("/login", async (req, res) => {
    const { username, password } = req.body;
    const [rows] = await db.execute("SELECT * FROM users WHERE username = ?", [username || ""]);
    const user = rows[0];
    if (!user || !(await bcrypt.compare(password || "", user.password))) {
      return res.status(400).json({ error: "Invalid username or password" });
    }
    return res.json({ user: { id: user.id, username: user.username } });
  });

  router.get("/listings", async (req, res) => {
    const { lat, lng, radius = 10, type = "all" } = req.query;
    const values = [];
    let sql = "SELECT l.*, u.username, u.email, u.phone FROM listings l JOIN users u ON u.id = l.author_id";
    if (type !== "all") { sql += " WHERE l.type = ?"; values.push(type); }
    sql += " ORDER BY l.created_at DESC";
    const [rows] = await db.execute(sql, values);
    const listings = rows.map((row) => ({
      _id: row.id,
      title: row.title,
      description: row.description,
      type: row.type,
      price: Number(row.price),
      image: row.image,
      location: { lat: Number(row.latitude), lng: Number(row.longitude) },
      author: { _id: row.author_id, username: row.username, email: row.email, phone: row.phone },
      distance: lat && lng ? distanceInKm(Number(lat), Number(lng), Number(row.latitude), Number(row.longitude)) : 0,
      createdAt: row.created_at,
    })).filter((listing) => !lat || !lng || listing.distance <= Number(radius));
    return res.json(listings);
  });

  router.post("/listings", async (req, res) => {
    const { title, description, type, price = 0, image = "", location, authorId } = req.body;
    if (!title || !description || !["item", "skill"].includes(type) || !location || !authorId) {
      return res.status(400).json({ error: "Missing listing information" });
    }
    const [result] = await db.execute(
      "INSERT INTO listings (title, description, type, price, latitude, longitude, image, author_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      [title, description, type, price, location.lat, location.lng, image, authorId],
    );
    return res.status(201).json({ id: result.insertId, message: "Listing created" });
  });

  router.get("/listings/user/:userId", async (req, res) => {
    const [rows] = await db.execute("SELECT * FROM listings WHERE author_id = ? ORDER BY created_at DESC", [req.params.userId]);
    return res.json(rows.map((row) => ({
      _id: row.id, title: row.title, description: row.description, type: row.type,
      price: Number(row.price), image: row.image,
      location: { lat: Number(row.latitude), lng: Number(row.longitude) },
      author: row.author_id, createdAt: row.created_at,
    })));
  });

  router.delete("/listings/:id", async (req, res) => {
    const [result] = await db.execute("DELETE FROM listings WHERE id = ? AND author_id = ?", [req.params.id, req.body.userId]);
    if (!result.affectedRows) return res.status(404).json({ error: "Listing not found" });
    return res.json({ message: "Listing deleted" });
  });

  return router;
}

module.exports = { createLegacyRouter };
