import { useState, useEffect, useContext } from "react";
import Navbar from "./components/Navbar";
import Hero from "./components/Hero";
import ListingGrid from "./components/ListingGrid";
import PostListingModal from "./components/PostListingModal";
import AuthModal from "./components/AuthModal";
import PublicPreview from "./components/PublicPreview";
import MemberHub from "./components/MemberHub";
import { AuthContext } from "./context/AuthContext";
import { getListings, getMyListings, createListing, deleteListing } from "./services/api";
import { AnimatedBackground, LoadingOverlay, ScrollExperience } from "./components/Motion";

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
      const data = await getMyListings(user.id);
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
      
      await createListing({ ...newListingData, authorId: user.id });
      fetchCommunityListings(); 
      fetchUserListings(); 
    } catch (error) {
      console.error("Failed to create listing", error);
    }
  };

  const handleDeleteListing = async (id) => {
    try {
      await deleteListing(id, user.id);
      fetchCommunityListings();
      fetchUserListings();
    } catch (error) {
      console.error("Failed to delete listing", error);
    }
  };

  return (
    <>
      <LoadingOverlay />
      <AnimatedBackground />
      <ScrollExperience />
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
          <>
            <MemberHub
              user={user}
              listings={listings}
              myListings={myListings}
              radius={radius}
              onPost={() => setIsModalOpen(true)}
              onShowMine={() => { setActiveTab("mine"); document.querySelector(".listings")?.scrollIntoView({ behavior: "smooth" }); }}
              onShowCommunity={() => { setActiveTab("community"); document.querySelector(".listings")?.scrollIntoView({ behavior: "smooth" }); }}
            />
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
          </>
        ) : (
          <PublicPreview onJoin={() => setIsAuthModalOpen(true)} />
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
