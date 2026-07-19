import { motion } from "framer-motion";

export default function ListingCard({ listing, isMine, onDelete, onContact }) {
  const hours = (String(listing._id || "17").split("").reduce((sum, value) => sum + value.charCodeAt(0), 0) % 48) + 1;
  return <motion.article layout className={`card ${listing.type}`} initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: .97 }} whileHover={{ y: -5 }} transition={{ duration: .35 }}>
    {listing.image && <div className="card-media"><img src={listing.image} alt={listing.title}/><span className={`badge ${listing.type}`}>{listing.type === "item" ? "Item" : "Skill"}</span></div>}
    <div className="card-body">
      {!listing.image && <span className={`badge ${listing.type}`}>{listing.type === "item" ? "Item" : "Skill"}</span>}
      <button className={`card-action ${isMine ? "danger" : ""}`} onClick={isMine ? onDelete : onContact} aria-label={isMine ? `Delete ${listing.title}` : `Contact about ${listing.title}`}><i className={isMine ? "ri-delete-bin-6-line" : "ri-chat-1-line"}/><span>{isMine ? "Delete" : "Contact"}</span></button>
      <h3>{listing.title}</h3><p>{listing.description}</p>
      <footer><span><i className="ri-time-line"/>{hours} hours left</span>{!isMine && listing.distance !== undefined && <span><i className="ri-navigation-line"/>{listing.distance.toFixed(1)} km</span>}</footer>
    </div>
  </motion.article>;
}