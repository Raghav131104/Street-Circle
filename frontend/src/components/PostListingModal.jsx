import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function PostListingModal({ isOpen, onClose, onSubmit, communities = [] }) {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    type: "item",
    price: 0,
    category: "tools",
    communityId: ""
  });
  const [submitError, setSubmitError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [files, setFiles] = useState([]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError("");
    setIsSubmitting(true);
    try {
      await onSubmit(formData, files);
      setFormData({ title: "", description: "", type: "item", price: 0, category: "tools", communityId: "" });
      setFiles([]);
      onClose();
    } catch (error) {
      setSubmitError(error.response?.data?.error?.message || error.message || "The listing could not be created.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        className="modal-overlay"
        role="presentation"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onMouseDown={onClose}
      >
        <motion.section
          className="modal-content"
          role="dialog"
          aria-modal="true"
          aria-labelledby="post-listing-title"
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 50, opacity: 0 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <button className="modal-close" type="button" aria-label="Close listing dialog" onClick={onClose}>
            &times;
          </button>
          <h2 id="post-listing-title" style={{ marginBottom: "24px", color: "#1a1a1a" }}>Post new listing</h2>
          
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="listing-community">Community</label>
              <select id="listing-community" required value={formData.communityId} onChange={(e) => setFormData({ ...formData, communityId: e.target.value })}>
                <option value="">Select an active community</option>
                {communities.map((community) => <option key={community.id} value={community.id}>{community.name}</option>)}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="listing-images">Images (optional, up to 5)</label>
              <input id="listing-images" type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={(event) => setFiles(Array.from(event.target.files || []).slice(0, 5))}/>
              {files.length > 0 && <small>{files.length} image{files.length === 1 ? "" : "s"} selected. Files are validated again by the server.</small>}
            </div>
            <div className="form-group">
              <label htmlFor="listing-title">Title</label>
              <input
                id="listing-title"
                type="text"
                required
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="What are you offering?"
              />
            </div>
            <div className="form-group">
              <label htmlFor="listing-category">Category</label>
              <input id="listing-category" required value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })} />
            </div>
            
            <div className="form-group">
              <label htmlFor="listing-description">Description</label>
              <textarea
                id="listing-description"
                required
                rows="3"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Give some details..."
              ></textarea>
            </div>
            
            <div className="form-group">
              <label htmlFor="listing-type">Type</label>
              <select
                id="listing-type"
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              >
                <option value="item">Physical Item</option>
                <option value="skill">Skill / Service</option>
              </select>
            </div>

            {submitError && <p className="form-error" role="alert">{submitError}</p>}
            <button type="submit" disabled={isSubmitting || communities.length === 0} className="submit-btn" style={{ marginTop: "8px" }}>
              {isSubmitting ? "Posting..." : communities.length === 0 ? "Join a community first" : "Post Listing"}
            </button>
          </form>
        </motion.section>
      </motion.div>
    </AnimatePresence>
  );
}
