# ADR 006: Modular Monolith versus MVC-only or Microservices

## Context
StreetCircle has several domains but one developer, one release, one local process, and no independent team/deployment/scale requirements.

## Decision
Use a feature-based layered modular monolith. Each feature owns route/controller/service/policy/repository/model responsibilities; shared code is limited to real cross-cutting concerns.

## Alternatives
One global MVC folders-only layout; a single server file; microservices.

## Why selected
Feature boundaries improve navigation/testing and preserve in-process transactions and simple local operation without distributed-system overhead.

## Trade-offs
Node cannot enforce every module boundary, and one process shares failures/resources. Microservices offer independent deployment but add network contracts, observability, retries, data consistency, and operations.

## How verified
Business services take primitive/context arguments rather than Express objects; policies and repositories are unit-tested; one process runs every verified workflow.

## Limitations
Some notification/audit calls cross feature modules synchronously and need disciplined ownership.

## Migration trigger
Extract a module only when independent team ownership, deploy cadence, scaling, regulatory isolation, or failure isolation is measured to outweigh distributed complexity.
