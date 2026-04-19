import { motion } from "framer-motion";
import { useContext } from "react";
import { AuthContext } from "../context/AuthContext";

export default function Navbar({ onPostClick, onLoginClick }) {
  const { user, logout } = useContext(AuthContext);
  return (
    <motion.header
      className="navbar"
      initial={{ y: -50, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
    >
      <div className="logo">
        <span className="dot">
          <i className="ri-map-pin-2-line"></i>
        </span>
        StreetCircle
      </div>
      <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
        {user ? (
          <>
            <span style={{ fontSize: "14px", color: "#666", fontWeight: "500" }}>
              <i className="ri-user-line" style={{ marginRight: "4px" }}></i>
              Logged In
            </span>
            <button className="post-btn" onClick={onPostClick}>
              + Post Listing
            </button>
            <button 
              onClick={logout}
              style={{ background: "none", border: "none", color: "#888", cursor: "pointer", fontWeight: "600", fontSize: "14px" }}
            >
              Logout
            </button>
          </>
        ) : (
          <button className="post-btn" style={{ background: "#fff", borderColor: "#e1e1e1", color: "#333" }} onClick={onLoginClick}>
            Login / Sign Up
          </button>
        )}
      </div>
    </motion.header>
  );
}
