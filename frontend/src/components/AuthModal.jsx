import { useState, useContext } from "react";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";
import { AuthContext } from "../context/AuthContext";

const API_URL = "http://localhost:5005/api/auth";

export default function AuthModal({ isOpen, onClose }) {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({ username: "", password: "", email: "", phone: "" });
  const [error, setError] = useState("");
  const { login } = useContext(AuthContext);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      const endpoint = isLogin ? "/login" : "/register";
      const { data } = await axios.post(`${API_URL}${endpoint}`, formData);
      login(data.token, data.user);
      onClose();
      setFormData({ username: "", password: "", email: "", phone: "" });
    } catch (err) {
      setError(err.response?.data?.error || "Authentication failed");
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        className="modal-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className="modal-content"
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 50, opacity: 0 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          onClick={(e) => e.stopPropagation()}
        >
          <button className="modal-close" onClick={onClose}>&times;</button>
          <h2 style={{ marginBottom: "8px", color: "#1a1a1a" }}>
            {isLogin ? "Welcome Back" : "Join StreetCircle"}
          </h2>
          <p style={{ color: "#666", marginBottom: "24px" }}>
            {isLogin ? "Log in to post your listings." : "Create an account to join your neighbors."}
          </p>

          {error && <p style={{ color: "red", marginBottom: "16px", fontSize: "14px" }}>{error}</p>}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Username</label>
              <input
                type="text"
                required
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              />
            </div>
            
            {!isLogin && (
              <>
                <div className="form-group">
                  <label>Email</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Phone Number</label>
                  <input
                    type="tel"
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>
              </>
            )}

            <div className="form-group">
              <label>Password</label>
              <input
                type="password"
                required
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              />
            </div>

            <button type="submit" className="submit-btn" style={{ marginBottom: "16px" }}>
              {isLogin ? "Log In" : "Sign Up"}
            </button>
            
            <p style={{ textAlign: "center", fontSize: "14px", color: "#666" }}>
              {isLogin ? "Don't have an account? " : "Already have an account? "}
              <button 
                type="button" 
                style={{ background: "none", border: "none", color: "#0f9d7a", fontWeight: "600", cursor: "pointer" }}
                onClick={() => { setIsLogin(!isLogin); setError(""); }}
              >
                {isLogin ? "Sign Up" : "Log In"}
              </button>
            </p>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
