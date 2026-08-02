# Phase 5 Learning Note: Listings and Geospatial Discovery

StreetCircle now stores listing locations as GeoJSON `Point` values in `[longitude, latitude]` order and asks MongoDB to perform radius discovery through its `2dsphere` index. Browser geolocation is requested with a manual coordinate fallback; denial and failure do not silently substitute a fake location.

The request flow is route -> authentication/validation middleware -> controller -> listing service -> repository -> Mongoose. Controllers translate HTTP, services verify active community membership and ownership/moderator policy, and the repository owns `$geoNear`, filters, stable sorting, and bounded reads. Author identity always comes from the verified session.

Cursor pagination encodes the last distance and ID for nearby results, or creation time and ID for non-geospatial feeds. This avoids increasingly expensive offset scans and prevents duplicate ordering when values tie. The API caps a page at 50. A cursor is query-specific; clients must discard it when location or filters change.

Haversine filtering in Node would require fetching candidates before calculating distance, increasing data transfer and memory use to O(n). MongoDB's spatial index prunes candidates in the database. The application still validates latitude, longitude, maximum radius, page size, listing fields, status, membership, and ownership before executing work.

The deterministic Atlas integration verified authentication, server-owned identity, active membership, geospatial ordering, cursor behavior, ownership rejection, update, and soft deletion. The seeded feed explain used `ix_listings_community_feed`, examined one key and one document, and returned one. This confirms index selection on the seed data but does not establish large-scale latency.

Alternatives are client-side Haversine calculations, SQL/PostGIS, Atlas Search, or an external search engine. PostGIS is an excellent alternative for relational/geospatial workloads; Atlas Search or Elasticsearch becomes reasonable only after measured text-search relevance or scale requirements exceed MongoDB queries. Local limitations include browser permission variability, network reliance on Atlas, and regex text matching.

Likely interviewer questions:

1. Why are GeoJSON coordinates longitude-first?
2. Why use `$geoNear` instead of calculating Haversine distance in Node?
3. How does the cursor remain stable when distances tie?
4. Where is listing ownership enforced?
5. Which query pattern justifies each listing index?

Skeptical follow-ups:

1. How would you prove the spatial index remains effective with one million listings?
2. What breaks if a client reuses a cursor after changing the radius or filter?

Discussion ladder: local MongoDB geospatial query -> nearby-discovery requirement -> basic regex search and Atlas network dependency -> PostGIS/Atlas Search/external search -> operational and relevance trade-offs -> migrate only after explain plans, p95 latency, or relevance tests fail a defined target.
