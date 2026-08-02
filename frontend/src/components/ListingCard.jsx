import { useState } from "react";
import { motion } from "framer-motion";
import { resolveMediaUrl } from "../services/api";

export default function ListingCard({ listing, isMine, onDelete, onRequest }) {
  const [imageFailed, setImageFailed] = useState(false);
  const hours = (String(listing.id || "17").split("").reduce((sum, value) => sum + value.charCodeAt(0), 0) % 48) + 1;
  const image = listing.media?.[0];
  return <motion.article layout className={`card ${listing.type}`} initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: .97 }} whileHover={{ y: -5 }} transition={{ duration: .35 }}>
    {image && !imageFailed && <div className="card-media"><img src={resolveMediaUrl(image.url)} alt={listing.title} loading="lazy" onError={() => setImageFailed(true)}/><span className={`badge ${listing.type}`}>{listing.type === "item" ? "Item" : "Skill"}</span></div>}
    {image && imageFailed && <div className="card-media media-placeholder" role="img" aria-label="Image unavailable"><i className="ri-image-off-line"/><span>Image unavailable</span></div>}
    <div className="card-body">
      {!image && <span className={`badge ${listing.type}`}>{listing.type === "item" ? "Item" : "Skill"}</span>}
      {isMine && <button className="card-action danger" onClick={onDelete} aria-label={`Delete ${listing.title}`}><i className="ri-delete-bin-6-line"/><span>Delete</span></button>}
      {!isMine && listing.status === "active" && <button className="card-action" onClick={onRequest} aria-label={`Request ${listing.title}`}><i className="ri-hand-heart-line"/><span>Request</span></button>}
      <h3>{listing.title}</h3><p>{listing.description}</p>
      <footer><span><i className="ri-time-line"/>{hours} hours left</span>{!isMine && listing.distanceMeters !== undefined && <span><i className="ri-navigation-line"/>{(listing.distanceMeters / 1000).toFixed(1)} km</span>}</footer>
    </div>
  </motion.article>;
}
