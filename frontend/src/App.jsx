import { useState, useEffect, useContext } from "react";
import Navbar from "./components/Navbar";
import Hero from "./components/Hero";
import ListingGrid from "./components/ListingGrid";
import PostListingModal from "./components/PostListingModal";
import AuthModal from "./components/AuthModal";
import { AuthContext } from "./context/AuthContext";
import { getListings, getMyListings, createListing, deleteListing } from "./services/api";

function App() {
  const { user } = useContext(AuthContext);
  const [listings, setListings] = useState([]);
  const [myListings, setMyListings] = useState([]);
  const [radius, setRadius] = useState(2);
  const [filterType, setFilterType] = useState("all");
  const [activeTab, setActiveTab] = useState("community");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  // Mock auto-assigned location for MVP Phase 1
  const userLocation = { lat: 40.7128, lng: -74.006 };

  const fetchCommunityListings = async () => {
    try {
      const data = await getListings(userLocation.lat, userLocation.lng, radius, filterType);
      setListings(data);
    } catch (error) {
      console.error("Failed to load listings", error);
    }
  };

  const fetchUserListings = async () => {
    if (!user) return;
    try {
      const data = await getMyListings();
      setMyListings(data);
    } catch (error) {
      console.error("Failed to load my listings", error);
    }
  };

  useEffect(() => {
    fetchCommunityListings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [radius, filterType]);

  useEffect(() => {
    if (user) {
      fetchUserListings();
    }
  }, [user]);

  const handlePostSubmit = async (formData) => {
    try {
      const newListingData = {
        ...formData,
        location: {
          lat: userLocation.lat,
          lng: userLocation.lng
        }
      };
      
      await createListing(newListingData);
      fetchCommunityListings(); 
      fetchUserListings(); 
    } catch (error) {
      console.error("Failed to create listing", error);
    }
  };

  const handleDeleteListing = async (id) => {
    try {
      await deleteListing(id);
      fetchCommunityListings();
      fetchUserListings();
    } catch (error) {
      console.error("Failed to delete listing", error);
    }
  };

  return (
    <>
      <Navbar 
        onPostClick={() => user ? setIsModalOpen(true) : setIsAuthModalOpen(true)} 
        onLoginClick={() => setIsAuthModalOpen(true)} 
      />
      
      <main>
        <Hero 
          radius={radius} 
          setRadius={setRadius} 
          count={listings.length} 
        />
        
        {user ? (
          <ListingGrid 
            listings={activeTab === "community" ? listings : myListings}
            user={user}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            filterType={filterType} 
            setFilterType={setFilterType} 
            radius={radius}
            onDelete={handleDeleteListing}
          />
        ) : (
          <div style={{ textAlign: "center", padding: "60px 20px", color: "#666" }}>
            <i className="ri-lock-2-line" style={{ fontSize: "48px", color: "#ccc", marginBottom: "16px", display: "block" }}></i>
            <h2>Join your neighborhood to see listings</h2>
            <p style={{ marginTop: "8px", marginBottom: "24px" }}>Sign up to view and post local items and skills.</p>
            <button className="submit-btn" style={{ width: "auto", padding: "12px 32px" }} onClick={() => setIsAuthModalOpen(true)}>
              Sign Up to Unlock
            </button>
          </div>
        )}
      </main>

      <PostListingModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSubmit={handlePostSubmit} 
      />

      <AuthModal 
        isOpen={isAuthModalOpen} 
        onClose={() => setIsAuthModalOpen(false)} 
      />
    </>
  );
}

export default App;
