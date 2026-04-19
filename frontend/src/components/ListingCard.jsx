import { motion } from "framer-motion";

export default function ListingCard({ listing, isMine, onDelete, onContact }) {
  return (
    <motion.div
      className={`card ${listing.type}`}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      whileHover={{ y: -8, transition: { duration: 0.2 } }}
    >
      <span className={`badge ${listing.type}`}>
        {listing.type === "item" ? "Item" : "Skill"}
      </span>
      {!isMine && listing.distance !== undefined && (
        <span className="distance">
          <i className="ri-map-pin-2-line"></i> {listing.distance.toFixed(1)} km
        </span>
      )}
      
      {isMine && (
        <button 
          onClick={onDelete}
          style={{ position: "absolute", top: "24px", right: "24px", cursor: "pointer", background: "#fee2e2", color: "#ef4444", border: "none", padding: "6px 12px", borderRadius: "8px", fontWeight: "600", fontSize: "14px", transition: "all 0.2s" }}
        >
          <i className="ri-delete-bin-line"></i> Delete
        </button>
      )}

      {!isMine && (
        <button 
          onClick={onContact}
          style={{ position: "absolute", top: "24px", right: "24px", cursor: "pointer", background: "#e8fbf4", color: "#0f9d7a", border: "none", padding: "6px 12px", borderRadius: "8px", fontWeight: "600", fontSize: "14px", transition: "all 0.2s" }}
        >
          <i className="ri-message-3-line"></i> Contact
        </button>
      )}
      
      {listing.image && (
        <img 
          src={listing.image} 
          alt={listing.title} 
          style={{ width: "calc(100% + 48px)", height: "200px", objectFit: "cover", margin: "16px -24px 0", borderBottom: "1px solid #eee" }} 
        />
      )}

      <h3 style={{ marginTop: listing.image ? "16px" : "16px" }}>{listing.title}</h3>
      <p>{listing.description}</p>
      {/* Fake hours left for MVP aesthetic */}
      <small><i className="ri-time-line"></i> {Math.floor(Math.random() * 48) + 1} hours left</small>
    </motion.div>
  );
}
