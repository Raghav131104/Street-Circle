const { AppError } = require("../../shared/errors/AppError");

const PUBLIC_TARGETS = ["ACCEPTED", "COMPLETED", "REJECTED", "CANCELLED"];

function actorRole(request, actorId) {
  if (request.requesterId.toString() === actorId) return "requester";
  if (request.ownerId.toString() === actorId) return "owner";
  return null;
}

function assertTransitionAllowed(request, actorId, target, { system = false } = {}) {
  const source = request.status;
  if (system) {
    if (target === "EXPIRED" && source === "PENDING") return;
    throw new AppError({ code: "REQUEST_TRANSITION_INVALID", message: `Cannot transition request from ${source} to ${target}`, status: 409 });
  }

  const role = actorRole(request, actorId);
  if (!role) throw new AppError({ code: "REQUEST_FORBIDDEN", message: "You cannot access this request", status: 403 });

  const allowed = (
    (target === "ACCEPTED" && source === "PENDING" && role === "owner")
    || (target === "REJECTED" && source === "PENDING" && role === "owner")
    || (target === "COMPLETED" && source === "ACCEPTED")
    || (target === "CANCELLED" && role === "requester" && ["PENDING", "ACCEPTED"].includes(source))
    || (target === "CANCELLED" && role === "owner" && source === "ACCEPTED")
  );
  if (!allowed) {
    throw new AppError({ code: "REQUEST_TRANSITION_INVALID", message: `Cannot transition request from ${source} to ${target}`, status: 409 });
  }
}

module.exports = { PUBLIC_TARGETS, actorRole, assertTransitionAllowed };
