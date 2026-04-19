import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function PostListingModal({ isOpen, onClose, onSubmit }) {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    type: "item",
    price: 0,
    image: ""
  });

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
    setFormData({ title: "", description: "", type: "item", price: 0, image: "" });
    onClose();
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData({ ...formData, image: reader.result });
      };
      reader.readAsDataURL(file);
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
          <button className="modal-close" onClick={onClose}>
            &times;
          </button>
          <h2 style={{ marginBottom: "24px", color: "#1a1a1a" }}>Post new listing</h2>
          
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Title</label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="What are you offering?"
              />
            </div>
            
            <div className="form-group">
              <label>Description</label>
              <textarea
                required
                rows="3"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Give some details..."
              ></textarea>
            </div>
            
            <div className="form-group">
              <label>Type</label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              >
                <option value="item">Physical Item</option>
                <option value="skill">Skill / Service</option>
              </select>
            </div>

            <div className="form-group">
              <label>Upload Photo</label>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageChange}
              />
              {formData.image && <img src={formData.image} alt="Preview" style={{ marginTop: "10px", width: "100%", maxHeight: "150px", objectFit: "cover", borderRadius: "8px" }} />}
            </div>

            <button type="submit" className="submit-btn" style={{ marginTop: "8px" }}>
              Post Listing
            </button>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
