# ADR 009: Local Filesystem versus GridFS/Object Storage

## Context
The MCT needs free local image storage with real validation; paid S3/Cloudinary is forbidden and Base64-in-MongoDB is unsafe/inefficient.

## Decision
Use a `MediaStore` abstraction with one local-disk implementation. Store verified bytes under random safe keys and embed only bounded metadata/checksum in listings.

## Alternatives
MongoDB GridFS; S3-compatible object storage; Cloudinary; Base64 fields.

## Why selected
Local disk is free, simple, testable, and sufficient for a single local API host while the abstraction keeps service policy independent of storage details.

## Trade-offs
It is not shared/durable across hosts and requires separate backups. GridFS centralizes backup but loads MongoDB; object storage enables shared durability/CDN but adds credentials/network/cost.

## How verified
Tests prove magic-byte allow-listing, size/count/path bounds, create-only random keys, checksum, controlled reads, atomic metadata cap, and cleanup.

## Limitations
Header verification is not malware scanning/full decoding; crash/disk failure can create loss/orphans.

## Migration trigger
Adopt object storage when multiple stateless API instances, recovery objectives, storage capacity, or measured media latency/error targets make local disk insufficient.
