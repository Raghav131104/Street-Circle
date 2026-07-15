const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const file = path.join(__dirname, ".local-data.json");
const empty = { users: [], listings: [] };

function read() {
  try { return { ...empty, ...JSON.parse(fs.readFileSync(file, "utf8")) }; }
  catch { return { users: [], listings: [] }; }
}
function write(data) { fs.writeFileSync(file, JSON.stringify(data, null, 2)); }
function id() { return crypto.randomUUID().replaceAll("-", ""); }

exports.findUser = (username) => read().users.find((user) => user.username.toLowerCase() === username.toLowerCase());
exports.createUser = (fields) => { const data = read(); const user = { _id: id(), ...fields, createdAt: new Date().toISOString() }; data.users.push(user); write(data); return user; };
exports.getListings = () => { const data = read(); return data.listings.map((listing) => ({ ...listing, author: data.users.find((user) => user._id === listing.author) || { _id: listing.author, username: "Neighbor" } })).sort((a,b) => new Date(b.createdAt)-new Date(a.createdAt)); };
exports.getUserListings = (userId) => read().listings.filter((listing) => listing.author === userId).sort((a,b) => new Date(b.createdAt)-new Date(a.createdAt));
exports.createListing = (fields) => { const data = read(); const listing = { _id: id(), ...fields, createdAt: new Date().toISOString() }; data.listings.push(listing); write(data); return listing; };
exports.deleteListing = (listingId, userId) => { const data = read(); const listing = data.listings.find((item) => item._id === listingId); if (!listing) return "missing"; if (listing.author !== userId) return "forbidden"; data.listings = data.listings.filter((item) => item._id !== listingId); write(data); return "deleted"; };
