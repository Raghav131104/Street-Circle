# ADR 002: MongoDB Atlas Free versus Local Community Server

Context: The original requirement selected local MongoDB Community Server. Its Windows package download failed with DNS error `0x80072ee7`. The user explicitly chose to reuse an existing Atlas M0 free cluster.

Decision: Use Atlas M0 with dedicated least-privilege `readWrite` access to `streetcircle_dev` and `streetcircle_test`, plus a current-IP `/32` allow-list. Preserve the unrelated pre-existing `streetcircle` database.

Alternatives: Local Community Server, paid Atlas tiers, MySQL/PostgreSQL.

Why selected: It is free, already owned by the user, supports required GeoJSON/index behavior, and avoids the blocked installer.

Trade-offs: Internet/account/IP-list availability becomes a development dependency. The free tier has constrained resources and fewer operational features. It is easier to start than local MongoDB but less self-contained.

How verified: Static Mongoose schema/index tests pass. Live ping, deterministic seed, index synchronization, EJSON backup, and query explain passed from the user's terminal. The feed used `ix_listings_community_feed`, examining one key/document for one result.

Limitations: No offline database, external provider dependency, dynamic public IP maintenance, M0 limits, and no claim of production availability.

Migration trigger: Move to local Community Server when offline/self-contained development is required; consider a paid managed tier only after measured storage/throughput/availability requirements exceed M0 and justify cost.
