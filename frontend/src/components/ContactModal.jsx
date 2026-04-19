import { motion, AnimatePresence } from "framer-motion";

export default function ContactModal({ isOpen, onClose, user }) {
  if (!isOpen || !user) return null;

  return (
    <AnimatePresence>
      <motion.div 
        className="modal-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.div 
          className="modal-content"
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 50, opacity: 0 }}
          style={{ maxWidth: "400px", textAlign: "center" }}
        >
          <button className="modal-close" onClick={onClose}>
            <i className="ri-close-line"></i>
          </button>
          
          <div style={{ width: "64px", height: "64px", background: "#e8fbf4", color: "#0f9d7a", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "32px", margin: "0 auto 20px" }}>
            <i className="ri-user-smile-line"></i>
          </div>

          <h2 style={{ marginBottom: "8px" }}>Contact {user.username}</h2>
          <p style={{ color: "#666", marginBottom: "24px" }}>Reach out directly to arrange details!</p>

          <div style={{ background: "#f8f9fa", borderRadius: "12px", padding: "16px", marginBottom: "16px", textAlign: "left", display: "flex", alignItems: "center", gap: "16px" }}>
            <div style={{ background: "white", padding: "10px", borderRadius: "10px", boxShadow: "0 2px 8px rgba(0,0,0,0.05)", color: "#0f9d7a" }}>
              <i className="ri-mail-send-line" style={{ fontSize: "20px" }}></i>
            </div>
            <div>
              <small style={{ display: "block", color: "#888", fontWeight: "600" }}>Email Address</small>
              <strong>{user.email || "Not provided"}</strong>
            </div>
          </div>

          <div style={{ background: "#f8f9fa", borderRadius: "12px", padding: "16px", marginBottom: "30px", textAlign: "left", display: "flex", alignItems: "center", gap: "16px" }}>
            <div style={{ background: "white", padding: "10px", borderRadius: "10px", boxShadow: "0 2px 8px rgba(0,0,0,0.05)", color: "#0f9d7a" }}>
              <i className="ri-phone-line" style={{ fontSize: "20px" }}></i>
            </div>
            <div>
              <small style={{ display: "block", color: "#888", fontWeight: "600" }}>Phone Number</small>
              <strong>{user.phone || "Not provided"}</strong>
            </div>
          </div>

          <button className="submit-btn" onClick={onClose}>
            Done
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
