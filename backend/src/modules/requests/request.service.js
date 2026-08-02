const { AppError } = require("../../shared/errors/AppError");
const { assertActiveCommunityMember } = require("../listings/listing.policy");
const { decodeRequestCursor, encodeRequestCursor } = require("./request.cursor");
const { actorRole, assertTransitionAllowed } = require("./request.machine");
const { requestRepository } = require("./request.repository");

function historyDto(item) {
  return {
    from: item.from ?? null,
    to: item.to,
    actorId: item.actorId?.toString() || null,
    at: item.at,
  };
}

function requestDto(request) {
  return {
    id: request._id.toString(),
    listingId: request.listingId.toString(),
    requesterId: request.requesterId.toString(),
    ownerId: request.ownerId.toString(),
    message: request.message || "",
    status: request.status,
    statusHistory: (request.statusHistory || []).map(historyDto),
    acceptedAt: request.acceptedAt || null,
    completedAt: request.completedAt || null,
    rejectedAt: request.rejectedAt || null,
    cancelledAt: request.cancelledAt || null,
    expiredAt: request.expiredAt || null,
    expiresAt: request.expiresAt,
    createdAt: request.createdAt,
    updatedAt: request.updatedAt,
  };
}

function matchesCreate(existing, listingId, message) {
  return existing.listingId.toString() === listingId && (existing.message || "") === message;
}

function isDuplicateKey(error) {
  return error?.code === 11000;
}

function replayFor(request, actorId, operationKey, target) {
  const entry = (request.statusHistory || []).find((item) => item.operationKey === operationKey);
  if (!entry) return false;
  if (entry.to !== target || entry.actorId?.toString() !== actorId) {
    throw new AppError({ code: "IDEMPOTENCY_KEY_REUSED", message: "Idempotency key was already used for another operation", status: 409 });
  }
  return true;
}

function listingTransition(source, target) {
  if (source === "PENDING" && target === "ACCEPTED") return { from: "active", to: "reserved" };
  if (source === "ACCEPTED" && target === "COMPLETED") return { from: "reserved", to: "closed" };
  if (source === "ACCEPTED" && target === "CANCELLED") return { from: "reserved", to: "active" };
  return null;
}

function createRequestService({
  repository = requestRepository, notificationService = null, auditService = null, now = () => new Date(),
} = {}) {
  return {
    async create(actorId, input, operationKey, context = {}) {
      const message = input.message || "";
      const replay = await repository.findIdempotent(actorId, operationKey);
      if (replay) {
        if (!matchesCreate(replay, input.listingId, message)) {
          throw new AppError({ code: "IDEMPOTENCY_KEY_REUSED", message: "Idempotency key was already used for another operation", status: 409 });
        }
        return { request: requestDto(replay), replayed: true };
      }

      const listing = await repository.findListing(input.listingId);
      if (!listing || listing.status === "removed") throw new AppError({ code: "LISTING_NOT_FOUND", message: "Listing not found", status: 404 });
      if (listing.status !== "active") throw new AppError({ code: "LISTING_NOT_AVAILABLE", message: "Listing is not available", status: 409 });
      if (listing.authorId.toString() === actorId) throw new AppError({ code: "SELF_REQUEST_FORBIDDEN", message: "You cannot request your own listing", status: 409 });
      assertActiveCommunityMember(await repository.findMembership(actorId, listing.communityId));

      const createdAt = now();
      try {
        const request = await repository.create({
          listingId: listing._id,
          requesterId: actorId,
          ownerId: listing.authorId,
          message,
          status: "PENDING",
          idempotencyKey: operationKey,
          expiresAt: new Date(createdAt.getTime() + 7 * 24 * 60 * 60 * 1000),
          statusHistory: [{ from: null, to: "PENDING", actorId, operationKey, at: createdAt }],
        });
        if (notificationService) await notificationService.create({
          userId: request.ownerId,
          type: "request.created",
          title: "New listing request",
          body: "A community member requested one of your listings.",
          entityType: "request",
          entityId: request._id,
          deduplicationKey: `request:${request._id}:created`,
        });
        await auditService?.record({
          actorId, action: "request.create", entityType: "request", entityId: request._id,
          requestId: context.requestId, metadata: { listingId: request.listingId.toString() },
        });
        return { request: requestDto(request), replayed: false };
      } catch (error) {
        if (!isDuplicateKey(error)) throw error;
        const existing = await repository.findIdempotent(actorId, operationKey);
        if (existing && matchesCreate(existing, input.listingId, message)) {
          return { request: requestDto(existing), replayed: true };
        }
        throw new AppError({ code: "REQUEST_ALREADY_ACTIVE", message: "An active request already exists for this listing", status: 409, cause: error });
      }
    },

    async get(actorId, id) {
      const request = await repository.findById(id);
      if (!request) throw new AppError({ code: "REQUEST_NOT_FOUND", message: "Request not found", status: 404 });
      if (!actorRole(request, actorId)) throw new AppError({ code: "REQUEST_FORBIDDEN", message: "You cannot access this request", status: 403 });
      return requestDto(request);
    },

    async list(actorId, input) {
      const cursor = decodeRequestCursor(input.cursor);
      const records = await repository.list(actorId, input, cursor);
      const hasMore = records.length > input.limit;
      const page = records.slice(0, input.limit);
      const last = page.at(-1);
      return {
        requests: page.map(requestDto),
        nextCursor: hasMore && last ? encodeRequestCursor({ createdAt: last.createdAt.toISOString(), id: last._id.toString() }) : null,
      };
    },

    async transition(actorId, id, target, operationKey, context = {}) {
      const request = await repository.findById(id);
      if (!request) throw new AppError({ code: "REQUEST_NOT_FOUND", message: "Request not found", status: 404 });
      if (replayFor(request, actorId, operationKey, target)) return { request: requestDto(request), replayed: true };
      assertTransitionAllowed(request, actorId, target);
      try {
        const updated = await repository.transition({
          requestId: id,
          actorId,
          source: request.status,
          target,
          operationKey,
          now: now(),
          listingTransition: listingTransition(request.status, target),
        });
        if (updated) {
          if (notificationService) {
            const recipientId = updated.ownerId.toString() === actorId ? updated.requesterId : updated.ownerId;
            await notificationService.create({
              userId: recipientId,
              type: `request.${target.toLowerCase()}`,
              title: "Request status updated",
              body: `A listing request is now ${target.toLowerCase()}.`,
              entityType: "request",
              entityId: updated._id,
              deduplicationKey: `request:${updated._id}:${target}:${operationKey}`,
            });
          }
          await auditService?.record({
            actorId, action: "request.transition", entityType: "request", entityId: updated._id,
            requestId: context.requestId, metadata: { from: request.status, to: target },
          });
          return { request: requestDto(updated), replayed: false };
        }
      } catch (error) {
        if (error instanceof AppError) throw error;
        if (isDuplicateKey(error) && target === "ACCEPTED") {
          throw new AppError({ code: "REQUEST_SLOT_CONFLICT", message: "Another request already holds this listing", status: 409, cause: error });
        }
        throw error;
      }

      const current = await repository.findById(id);
      if (current && replayFor(current, actorId, operationKey, target)) return { request: requestDto(current), replayed: true };
      throw new AppError({ code: "REQUEST_STATE_CONFLICT", message: "Request state changed concurrently", status: 409 });
    },

    async expireDue(at = now(), limit = 100) {
      const expired = await repository.expireDue(at, limit);
      if (notificationService) await Promise.all(expired.map((request) => notificationService.create({
        userId: request.requesterId,
        type: "request.expired",
        title: "Request expired",
        body: "A pending listing request expired without a decision.",
        entityType: "request",
        entityId: request._id,
        deduplicationKey: `request:${request._id}:EXPIRED`,
      })));
      if (auditService) await Promise.all(expired.map((request) => auditService.record({
        actorId: null, action: "request.expire", entityType: "request", entityId: request._id,
        metadata: { previousStatus: "PENDING" },
      })));
      return expired.length;
    },
  };
}

module.exports = { createRequestService, listingTransition, replayFor, requestDto };
