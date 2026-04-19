import { useState } from "react";
import ListingCard from "./ListingCard";
import ContactModal from "./ContactModal";
import { motion, AnimatePresence } from "framer-motion";

export default function ListingGrid({ listings, user, activeTab, setActiveTab, filterType, setFilterType, radius, onDelete }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [contactInfo, setContactInfo] = useState(null);

  const filters = [
    { type: "all", label: "All", icon: "ri-stack-line" },
    { type: "item", label: "Items", icon: "ri-file-list-3-line" },
    { type: "skill", label: "Skills", icon: "ri-wrench-line" },
  ];

  // the parent App component already passes the correct array based on activeTab
  let displayedListings = listings;
  
  // Exclude user's own posts from the Community Feed
  if (activeTab === "community" && user) {
    displayedListings = displayedListings.filter(item => {
      // populate("author") gives an object, whereas standard query might give ID string
      const authorId = item.author?._id || item.author;
      return authorId !== user.id;
    });
  }

  if (filterType !== "all") {
    displayedListings = displayedListings.filter(item => item.type === filterType);
  }

  // Search query filter
  if (searchQuery.trim().length > 0) {
    const q = searchQuery.toLowerCase();
    displayedListings = displayedListings.filter(item => 
      item.title.toLowerCase().includes(q) || 
      item.description.toLowerCase().includes(q)
    );
  }

  return (
    <section className="listings">
      <div style={{ display: "flex", gap: "32px", marginBottom: "40px", borderBottom: "2px solid #e5e5e5", paddingBottom: "0" }}>
        <button 
          onClick={() => setActiveTab("community")}
          style={{ padding: "12px 8px", background: "none", border: "none", borderBottom: activeTab === "community" ? "3px solid #0f9d7a" : "3px solid transparent", fontSize: "16px", fontWeight: "600", color: activeTab === "community" ? "#0f9d7a" : "#888", cursor: "pointer", transition: "all 0.2s", marginBottom: "-2px", display: "flex", alignItems: "center", gap: "8px" }}
        >
          <i className="ri-earth-line" style={{ fontSize: "18px" }}></i>
          Community Feed
        </button>
        <button 
          onClick={() => setActiveTab("mine")}
          style={{ padding: "12px 8px", background: "none", border: "none", borderBottom: activeTab === "mine" ? "3px solid #0f9d7a" : "3px solid transparent", fontSize: "16px", fontWeight: "600", color: activeTab === "mine" ? "#0f9d7a" : "#888", cursor: "pointer", transition: "all 0.2s", marginBottom: "-2px", display: "flex", alignItems: "center", gap: "8px" }}
        >
          <i className="ri-user-smile-line" style={{ fontSize: "18px" }}></i>
          My Listings
        </button>
      </div>

      <div className="listings-header">
        <div>
          <h2>{activeTab === "mine" ? "Your Posts" : "Nearby Listings"}</h2>
          <p>{displayedListings.length} listings {activeTab === "community" && `within ${radius} km`}</p>
        </div>

        <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
          {/* Search Bar */}
          <div style={{ position: "relative", width: "240px" }}>
            <i className="ri-search-line" style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#888" }}></i>
            <input 
              type="text" 
              placeholder="Search items..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ width: "100%", padding: "10px 10px 10px 36px", borderRadius: "12px", border: "1px solid #e1e1e1", background: "#f9f9f9", fontSize: "14px", outline: "none" }}
            />
          </div>

          <div className="filters">
            {filters.map((f) => (
              <button 
                key={f.type} 
                className={filterType === f.type ? "active" : ""}
                onClick={() => setFilterType(f.type)}
              >
                <i className={f.icon}></i> {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>
     
      <motion.div layout className="cards">
        <AnimatePresence>
          {displayedListings.map((item) => (
            <ListingCard 
              key={item._id || Math.random()} 
              listing={item} 
              isMine={activeTab === "mine"} 
              onDelete={() => onDelete(item._id)} 
              onContact={() => setContactInfo(item.author)}
            />
          ))}
        </AnimatePresence>
        
        {displayedListings.length === 0 && (
           <p style={{ color: "#888", marginTop: "20px" }}>
             {searchQuery ? "No matches found for your search." : (activeTab === "mine" ? "You haven't posted anything yet!" : "No listings found nearby.")}
           </p>
        )}
      </motion.div>

      <ContactModal 
        isOpen={!!contactInfo} 
        user={contactInfo} 
        onClose={() => setContactInfo(null)} 
      />
    </section>
  );
}
