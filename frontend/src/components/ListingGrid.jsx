import { AnimatePresence, motion } from "framer-motion";
import ListingCard from "./ListingCard";

export default function ListingGrid({
  listings,
  user,
  activeTab,
  setActiveTab,
  filterType,
  setFilterType,
  searchQuery,
  setSearchQuery,
  radius,
  isLoading,
  canLoadMore,
  onLoadMore,
  onDelete,
  onRequest,
}) {
  const filters = [
    { type: "all", label: "All" },
    { type: "item", label: "Items" },
    { type: "skill", label: "Skills" },
  ];
  let displayed = listings;
  if (activeTab === "community" && user) {
    displayed = displayed.filter((item) => item.authorId !== user.id);
  }

  return <section className="listings">
    <div className="feed-tabs" role="tablist">
      <button className={activeTab === "community" ? "active" : ""} onClick={() => setActiveTab("community")}>Community</button>
      <button className={activeTab === "mine" ? "active" : ""} onClick={() => setActiveTab("mine")}>My listings</button>
    </div>
    <div className="listings-header">
      <div><span className="eyebrow">The neighborhood board</span><h2>{activeTab === "mine" ? "Things you've shared" : "Available near you"}</h2><p>{displayed.length} listings within {radius} km</p></div>
      <div className="listing-tools">
        <label className="search"><span className="sr-only">Search nearby listings</span><input type="search" placeholder="Search nearby listings" value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)}/></label>
        <div className="filters">{filters.map((filter) => <button key={filter.type} className={filterType === filter.type ? "active" : ""} onClick={() => setFilterType(filter.type)}>{filter.label}</button>)}</div>
      </div>
    </div>
    {isLoading && displayed.length === 0
      ? <div className="empty-state" role="status"><h3>Loading nearby listings...</h3></div>
      : <motion.div layout className="cards">
        <AnimatePresence mode="popLayout">{displayed.map((listing) => <ListingCard key={listing.id} listing={listing} isMine={activeTab === "mine"} onDelete={() => onDelete(listing.id)} onRequest={() => onRequest(listing)} />)}</AnimatePresence>
        {displayed.length === 0 && <div className="empty-state"><h3>No listings found</h3><p>Try a broader search or radius.</p></div>}
      </motion.div>}
    {canLoadMore && activeTab === "community" && <button className="load-more" type="button" disabled={isLoading} onClick={onLoadMore}>{isLoading ? "Loading..." : "Load more"}</button>}
  </section>;
}
