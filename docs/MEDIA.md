# Local Media Storage

## Implemented flow

`POST /api/v1/listings/:listingId/media` accepts the multipart field `files`. Authentication and listing author/moderator authorization run before any file write. Multer buffers at most five files and at most 5 MiB per file. Application code then checks PNG, JPEG, or WebP magic bytes; the browser filename, extension, and claimed MIME type are never trusted.

The `LocalMediaStore` generates a 128-bit random key with an extension derived from verified bytes, resolves it inside `project-data/uploads`, writes with create-only semantics, and returns SHA-256, size, MIME type, and timestamp metadata. Only that bounded metadata is embedded in the listing document. File bytes are never Base64-encoded in MongoDB.

The repository appends metadata with an atomic predicate on the current media-array size, so concurrent requests cannot exceed five images. If validation, storage, or the database append fails, newly written files are removed. Explicit media removal and listing removal delete their associated files. The public media route accepts only the generated key grammar and responds with a known image content type; arbitrary paths are rejected and the upload directory is not exposed as a general static directory.

## Limits and security

- Memory buffering bounds a request to approximately 25 MiB of file bytes plus overhead. This is simple locally but would require tighter concurrency controls or streaming at higher traffic.
- Header signatures reject renamed scripts and unsupported formats; they are not a full malware scanner or image decoder.
- Local disk is single-host state. Multiple application instances would not share files, backups must include the upload directory, and host loss loses unbacked files.
- Random keys prevent user-controlled paths. Files are served as verified image MIME types and are never executed by Node.
- An unexpected disk-delete failure after a successful database removal can leave an orphan. A future reconciliation command should compare database keys with disk keys if operational evidence shows this occurs.

## Alternatives and migration triggers

GridFS keeps bytes in MongoDB and participates in database backup operations, but increases database load and is unnecessary for small local images. S3-compatible object storage provides durable shared storage, lifecycle rules, signed upload flows, and CDN integration, but adds credentials, network cost, and operational dependencies. Cloudinary adds transformations and delivery but creates vendor/cost coupling. A CDN improves delivery latency but is not durable storage.

Move from local disk only when measurements or deployment topology require multiple stateless API instances, storage exceeds the host budget, backups cannot meet recovery objectives, or media delivery latency/error rate misses an explicit target. Those services are alternatives, not implemented claims.
