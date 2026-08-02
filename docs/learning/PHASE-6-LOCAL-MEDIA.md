# Phase 6 Learning Note: Validated Local Media

Media storage separates file bytes from domain metadata. The HTTP adapter parses a bounded multipart request, the service enforces listing authorization and the five-file invariant, `LocalMediaStore` owns safe filesystem operations, and MongoDB stores only bounded metadata. This keeps storage mechanics out of business services while preserving a single modular monolith.

Internally, magic-byte detection determines the actual format, a cryptographic random key prevents path control and collisions, SHA-256 supports integrity checks, and create-only writes avoid overwriting. The database append contains an atomic current-size condition; a losing concurrent upload removes its files and returns `409`. Reads validate the complete key grammar before resolving a path.

Security improves because client filenames, extensions, MIME claims, author IDs, and arbitrary paths are untrusted. Maximum count/size cap memory and disk abuse. Serving only known image MIME types and never executing uploads reduces arbitrary-file risk. Time is O(n) in file bytes for hashing/writing, with O(n) request memory because the local implementation buffers bounded files.

Alternatives are streaming multipart directly to disk, GridFS, S3-compatible storage, Cloudinary, and signed direct uploads. Buffering was chosen for a small local MCT because cleanup and signature checks are straightforward; it becomes inappropriate when concurrency times the 25 MiB request bound creates unacceptable memory pressure.

Local limitation: disk is not shared or independently durable. Production evolution is object storage plus signed operations and a CDN, triggered by multi-instance deployment, recovery objectives, capacity, or measured latency/error targets—not by a vague scalability claim.

Likely interviewer questions:

1. Why is checking the `Content-Type` header insufficient?
2. How do generated keys prevent path traversal?
3. What happens if the file write succeeds but MongoDB fails?
4. Why embed metadata but not image bytes?
5. What limits memory consumption for multipart requests?

Skeptical follow-ups:

1. Can a valid JPEG header still contain malicious data, and what would you add?
2. How would two API instances consistently serve these files?

Discussion ladder: validated local disk -> free local media requirement -> single-host durability and bounded memory -> GridFS/object storage/CDN -> cost and operational trade-offs -> migrate at measured memory, capacity, availability, or topology thresholds.
