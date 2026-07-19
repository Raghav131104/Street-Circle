const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
require("dotenv").config();
const db = require("./db");

const app = express();
const PORT = Number(process.env.PORT || 5005);

app.use(cors());
app.use(express.json({ limit: "10mb" }));

const distanceInKm = (lat1, lng1, lat2, lng2) => {
  const toRadians = (value) => value * Math.PI / 180;
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2))
    * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

app.get("/api/health", async (_req, res) => {
  try {
    await db.query("SELECT 1");
    res.json({ ok: true, database: "mysql" });
  } catch {
    res.status(503).json({ ok: false, error: "MySQL is unavailable" });
  }
});

app.post("/api/register", async (req, res) => {
  try {
    const { username, password, email, phone } = req.body;
    if (!username || !password || !email || !phone) {
      return res.status(400).json({ error: "All fields are required" });
    }
    const [existing] = await db.execute("SELECT id FROM users WHERE username = ?", [username]);
    if (existing.length) return res.status(400).json({ error: "Username already exists" });
    const passwordHash = await bcrypt.hash(password, 10);
    const [result] = await db.execute(
      "INSERT INTO users (username, password, email, phone) VALUES (?, ?, ?, ?)",
      [username, passwordHash, email, phone]
    );
    res.status(201).json({ user: { id: result.insertId, username } });
  } catch (error) {
    console.error("Register error:", error.message);
    res.status(500).json({ error: "Could not create account" });
  }
});

app.post("/api/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    const [rows] = await db.execute("SELECT * FROM users WHERE username = ?", [username || ""]);
    const user = rows[0];
    if (!user || !(await bcrypt.compare(password || "", user.password))) {
      return res.status(400).json({ error: "Invalid username or password" });
    }
    res.json({ user: { id: user.id, username: user.username } });
  } catch (error) {
    console.error("Login error:", error.message);
    res.status(500).json({ error: "Could not log in" });
  }
});

app.get("/api/listings", async (req, res) => {
  try {
    const { lat, lng, radius = 10, type = "all" } = req.query;
    const values = [];
    let sql = `SELECT l.*, u.username, u.email, u.phone
      FROM listings l JOIN users u ON u.id = l.author_id`;
    if (type !== "all") { sql += " WHERE l.type = ?"; values.push(type); }
    sql += " ORDER BY l.created_at DESC";
    const [rows] = await db.execute(sql, values);
    const listings = rows.map((row) => {
      const distance = lat && lng
        ? distanceInKm(Number(lat), Number(lng), Number(row.latitude), Number(row.longitude))
        : 0;
      return {
        _id: row.id,
        title: row.title,
        description: row.description,
        type: row.type,
        price: Number(row.price),
        image: row.image,
        location: { lat: Number(row.latitude), lng: Number(row.longitude) },
        author: { _id: row.author_id, username: row.username, email: row.email, phone: row.phone },
        distance,
        createdAt: row.created_at,
      };
    }).filter((listing) => !lat || !lng || listing.distance <= Number(radius));
    res.json(listings);
  } catch (error) {
    console.error("Listings error:", error.message);
    res.status(500).json({ error: "Could not load listings" });
  }
});

app.post("/api/listings", async (req, res) => {
  try {
    const { title, description, type, price = 0, image = "", location, authorId } = req.body;
    if (!title || !description || !["item", "skill"].includes(type) || !location || !authorId) {
      return res.status(400).json({ error: "Missing listing information" });
    }
    const [result] = await db.execute(
      `INSERT INTO listings
       (title, description, type, price, latitude, longitude, image, author_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [title, description, type, price, location.lat, location.lng, image, authorId]
    );
    res.status(201).json({ id: result.insertId, message: "Listing created" });
  } catch (error) {
    console.error("Create listing error:", error.message);
    res.status(500).json({ error: "Could not create listing" });
  }
});

app.get("/api/listings/user/:userId", async (req, res) => {
  try {
    const [rows] = await db.execute(
      "SELECT * FROM listings WHERE author_id = ? ORDER BY created_at DESC",
      [req.params.userId]
    );
    res.json(rows.map((row) => ({
      _id: row.id,
      title: row.title,
      description: row.description,
      type: row.type,
      price: Number(row.price),
      image: row.image,
      location: { lat: Number(row.latitude), lng: Number(row.longitude) },
      author: row.author_id,
      createdAt: row.created_at,
    })));
  } catch (error) {
    console.error("User listings error:", error.message);
    res.status(500).json({ error: "Could not load your listings" });
  }
});

app.delete("/api/listings/:id", async (req, res) => {
  try {
    const { userId } = req.body;
    const [result] = await db.execute(
      "DELETE FROM listings WHERE id = ? AND author_id = ?",
      [req.params.id, userId]
    );
    if (!result.affectedRows) return res.status(404).json({ error: "Listing not found" });
    res.json({ message: "Listing deleted" });
  } catch (error) {
    console.error("Delete listing error:", error.message);
    res.status(500).json({ error: "Could not delete listing" });
  }
});

app.listen(PORT, () => {
  console.log(`StreetCircle API running on http://localhost:${PORT}`);
});