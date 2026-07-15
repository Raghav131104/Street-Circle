const mongoose = require("mongoose");
const User = require("../models/User");
const store = require("../devStore");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const usingDatabase = () => mongoose.connection.readyState === 1;
const publicUser = (user) => ({ id: user._id, username: user.username });
const tokenFor = (user) => jwt.sign({ id: user._id }, process.env.JWT_SECRET || "fallback_secret", { expiresIn: "24h" });

exports.register = async (req, res) => {
  try {
    const { username, password, email, phone } = req.body;
    if (!username || !password || !email || !phone) return res.status(400).json({ error: "All fields are required" });
    const existingUser = usingDatabase() ? await User.findOne({ username }) : store.findUser(username);
    if (existingUser) return res.status(400).json({ error: "Username already exists" });
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = usingDatabase()
      ? await new User({ username, password: hashedPassword, email, phone }).save()
      : store.createUser({ username, password: hashedPassword, email, phone });
    res.status(201).json({ token: tokenFor(user), user: publicUser(user) });
  } catch (error) {
    console.error("Registration error:", error.message);
    res.status(500).json({ error: "Failed to register" });
  }
};

exports.login = async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = usingDatabase() ? await User.findOne({ username }) : store.findUser(username || "");
    if (!user || !(await bcrypt.compare(password || "", user.password))) return res.status(400).json({ error: "Invalid username or password" });
    res.status(200).json({ token: tokenFor(user), user: publicUser(user) });
  } catch (error) {
    console.error("Login error:", error.message);
    res.status(500).json({ error: "Failed to login" });
  }
};
