import { useCallback, useContext, useDeferredValue, useEffect, useMemo, useState } from "react";
import Navbar from "./components/Navbar";
import Hero from "./components/Hero";
import ListingGrid from "./components/ListingGrid";
import PostListingModal from "./components/PostListingModal";
import AuthModal from "./components/AuthModal";
import PublicPreview from "./components/PublicPreview";
import MemberHub from "./components/MemberHub";
import LocationControl from "./components/LocationControl";
import RequestModal from "./components/RequestModal";
import RequestsPanel from "./components/RequestsPanel";
import NotificationsPanel from "./components/NotificationsPanel";
import CommunityPanel from "./components/CommunityPanel";
import { AuthContext } from "./context/auth-context";
import {
  createListing,
  createRequest,
  deleteListing,
  getListings,
  getMyMemberships,
  getNotifications,
  getRequests,
  getUnreadNotificationCount,
  markAllNotificationsRead,
  markNotificationRead,
  transitionRequest,
  uploadListingMedia,
} from "./services/api";
import { AnimatedBackground, LoadingOverlay, ScrollExperience } from "./components/Motion";

function operationKey(prefix) {
  return `${prefix}-${crypto.randomUUID()}`;
}

function App() {
  const { user } = useContext(AuthContext);
  const [listings, setListings] = useState([]);
  const [memberships, setMemberships] = useState([]);
  const [incomingRequests, setIncomingRequests] = useState([]);
  const [outgoingRequests, setOutgoingRequests] = useState([]);
  const [requestError, setRequestError] = useState("");
  const [notifications, setNotifications] = useState([]);
  const [notificationCursor, setNotificationCursor] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notificationError, setNotificationError] = useState("");
  const [selectedListing, setSelectedListing] = useState(null);
  const [location, setLocation] = useState(null);
  const [locationStatus, setLocationStatus] = useState("requesting");
  const [locationError, setLocationError] = useState("");
  const [feedError, setFeedError] = useState("");
  const [isFeedLoading, setIsFeedLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const deferredSearchQuery = useDeferredValue(searchQuery);
  const [nextCursor, setNextCursor] = useState(null);
  const [radius, setRadius] = useState(2);
  const [filterType, setFilterType] = useState("all");
  const [activeTab, setActiveTab] = useState("community");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  const requestBrowserLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setLocationStatus("manual");
      setLocationError("This browser does not provide geolocation. Enter coordinates manually.");
      return;
    }
    setLocationStatus("requesting");
    setLocationError("");
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setLocation({ latitude: coords.latitude, longitude: coords.longitude });
        setLocationStatus("ready");
      },
      (error) => {
        setLocationStatus("manual");
        setLocationError(error.code === 1
          ? "Location permission was denied. Enter a location manually."
          : "Location could not be determined. Try again or enter it manually.");
      },
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 300_000 },
    );
  }, []);

  useEffect(() => {
    // Browser callbacks update state after the permission result.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    requestBrowserLocation();
  }, [requestBrowserLocation]);

  const fetchListings = useCallback(async ({ cursor = null, append = false } = {}) => {
    if (!location) return;
    setFeedError("");
    setIsFeedLoading(true);
    try {
      const data = await getListings({
        ...location,
        radiusMeters: radius * 1000,
        type: filterType,
        search: deferredSearchQuery.trim() || undefined,
        cursor,
        limit: 20,
      });
      setListings((current) => append ? [...current, ...data.listings] : data.listings);
      setNextCursor(data.nextCursor);
    } catch (error) {
      setFeedError(error.response?.data?.error?.message || "Nearby listings could not be loaded.");
    } finally {
      setIsFeedLoading(false);
    }
  }, [deferredSearchQuery, filterType, location, radius]);

  const fetchRequests = useCallback(async () => {
    if (!user) return;
    setRequestError("");
    try {
      const [incoming, outgoing] = await Promise.all([getRequests("owner"), getRequests("requester")]);
      setIncomingRequests(incoming.requests);
      setOutgoingRequests(outgoing.requests);
    } catch (error) {
      setRequestError(error.response?.data?.error?.message || "Requests could not be loaded.");
    }
  }, [user]);

  const fetchMemberships = useCallback(async () => {
    if (!user) return;
    try {
      setMemberships(await getMyMemberships());
    } catch {
      setMemberships([]);
    }
  }, [user]);

  const fetchNotifications = useCallback(async ({ cursor = null, append = false } = {}) => {
    if (!user) return;
    setNotificationError("");
    try {
      const [feed, count] = await Promise.all([
        getNotifications({ cursor, limit: 10 }),
        getUnreadNotificationCount(),
      ]);
      setNotifications((current) => append ? [...current, ...feed.notifications] : feed.notifications);
      setNotificationCursor(feed.nextCursor);
      setUnreadCount(count);
    } catch (error) {
      setNotificationError(error.response?.data?.error?.message || "Notifications could not be loaded.");
    }
  }, [user]);

  useEffect(() => {
    // The state update occurs after the API promise settles.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchListings();
  }, [fetchListings]);

  useEffect(() => {
    // The state update occurs after the membership query settles.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchMemberships();
  }, [fetchMemberships]);

  useEffect(() => {
    // The state update occurs after both request-feed promises settle.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchRequests();
  }, [fetchRequests]);

  useEffect(() => {
    // The state update occurs after both notification queries settle.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchNotifications();
  }, [fetchNotifications]);

  const activeCommunities = useMemo(() => memberships
    .filter((membership) => membership.status === "active" && membership.community)
    .map((membership) => membership.community), [memberships]);
  const myListings = useMemo(() => listings.filter((listing) => listing.authorId === user?.id), [listings, user]);

  const useManualLocation = (candidate) => {
    if (candidate.latitude < -90 || candidate.latitude > 90 || candidate.longitude < -180 || candidate.longitude > 180) {
      setLocationError("Coordinates are outside valid latitude/longitude ranges.");
      return;
    }
    setLocation(candidate);
    setLocationStatus("ready");
    setLocationError("");
  };

  const handlePostSubmit = async (formData, files) => {
    if (!location) throw new Error("A location is required");
    const { listing } = await createListing({ ...formData, ...location });
    if (files.length) {
      try {
        await uploadListingMedia(listing.id, files);
      } catch (error) {
        await deleteListing(listing.id).catch(() => {});
        throw error;
      }
    }
    await fetchListings();
  };

  const handleDeleteListing = async (id) => {
    await deleteListing(id);
    await fetchListings();
  };

  const handleCreateRequest = async (listingId, message) => {
    await createRequest(listingId, message, operationKey("create"));
    await fetchRequests();
  };

  const handleTransitionRequest = async (requestId, status) => {
    setRequestError("");
    try {
      await transitionRequest(requestId, status, operationKey(status.toLowerCase()));
      await Promise.all([fetchRequests(), fetchListings()]);
    } catch (error) {
      setRequestError(error.response?.data?.error?.message || "The request state could not be changed.");
    }
  };

  const handleNotificationRead = async (notificationId) => {
    await markNotificationRead(notificationId);
    await fetchNotifications();
  };

  const handleNotificationsReadAll = async () => {
    await markAllNotificationsRead();
    await fetchNotifications();
  };

  return <>
    <LoadingOverlay/>
    <AnimatedBackground/>
    <ScrollExperience/>
    <Navbar onPostClick={() => user ? setIsModalOpen(true) : setIsAuthModalOpen(true)} onLoginClick={() => setIsAuthModalOpen(true)}/>
    <main>
      <Hero radius={radius} setRadius={setRadius} count={listings.length}/>
      <LocationControl status={locationStatus} location={location} error={locationError} onRetry={requestBrowserLocation} onManual={useManualLocation}/>
      {feedError && <p className="page-error" role="alert">{feedError}</p>}
      {user ? <>
        <MemberHub user={user} listings={listings} myListings={myListings} radius={radius} onPost={() => setIsModalOpen(true)} onShowMine={() => setActiveTab("mine")} onShowCommunity={() => setActiveTab("community")}/>
        <CommunityPanel memberships={memberships} location={location} onChanged={() => Promise.all([fetchMemberships(), fetchNotifications()])}/>
        <NotificationsPanel notifications={notifications} unreadCount={unreadCount} nextCursor={notificationCursor} error={notificationError} onRead={handleNotificationRead} onReadAll={handleNotificationsReadAll} onLoadMore={(cursor) => fetchNotifications({ cursor, append: true })}/>
        <RequestsPanel incoming={incomingRequests} outgoing={outgoingRequests} error={requestError} onTransition={handleTransitionRequest}/>
        <ListingGrid
          listings={activeTab === "community" ? listings : myListings}
          user={user}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          filterType={filterType}
          setFilterType={setFilterType}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          radius={radius}
          isLoading={isFeedLoading}
          canLoadMore={Boolean(nextCursor)}
          onLoadMore={() => fetchListings({ cursor: nextCursor, append: true })}
          onDelete={handleDeleteListing}
          onRequest={setSelectedListing}
        />
      </> : <PublicPreview onJoin={() => setIsAuthModalOpen(true)}/>}
    </main>
    <PostListingModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSubmit={handlePostSubmit} communities={activeCommunities}/>
    <RequestModal listing={selectedListing} onClose={() => setSelectedListing(null)} onSubmit={handleCreateRequest}/>
    <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)}/>
  </>;
}

export default App;
