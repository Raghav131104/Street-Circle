# ADR 005: Mongoose versus Native MongoDB Driver

## Context
The application needs collection schemas, defaults/enums, hidden sensitive fields, timestamps, reusable models, indexes, and transactions while remaining explainable to a fresher.

## Decision
Use Mongoose models/repositories; use Zod at HTTP boundaries because Mongoose does not validate external input before business logic.

## Alternatives
Native MongoDB driver; another ODM; direct driver calls throughout services.

## Why selected
Mongoose centralizes document shape/index definitions and mapping conventions while repositories prevent ODM objects from leaking across every layer.

## Trade-offs
It adds abstraction, learning surface, and potential query surprises. The native driver is smaller and exposes MongoDB behavior more directly.

## How verified
Model tests inspect unique/TTL/partial/geospatial indexes; Atlas integration exercises validation, queries, transactions, and conditional updates.

## Limitations
Mongoose types are not runtime validation for arbitrary HTTP data, and careless populate/hooks can hide performance costs.

## Migration trigger
Use the native driver in a bounded module when profiling shows ODM overhead/query restrictions or a driver-only capability materially matters; migrate behind repositories rather than rewriting services.
