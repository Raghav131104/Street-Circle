import axios from "axios";

function resolveApiUrl(rawUrl) {
  const fallback = "http://localhost:5005/api/v1";
  try {
    const url = new URL(rawUrl || fallback);
    if (!['http:', 'https:'].includes(url.protocol)) throw new Error("unsupported protocol");
    return url.toString().replace(/\/$/, "");
  } catch (error) {
    throw new Error(`Invalid VITE_API_URL: ${error.message}`);
  }
}

const api = axios.create({
  baseURL: resolveApiUrl(import.meta.env.VITE_API_URL),
  timeout: 10_000,
  withCredentials: true,
  headers: { Accept: "application/json" },
});

export async function authenticate(mode, credentials) {
  const payload = mode === "login"
    ? { identifier: credentials.username, password: credentials.password }
    : { username: credentials.username, email: credentials.email, password: credentials.password };
  const { data } = await api.post(`/auth/${mode}`, payload);
  return data;
}

export async function getAuthenticatedUser() {
  const { data } = await api.get("/auth/me");
  return data.user;
}

export async function revokeSession() {
  await api.post("/auth/logout");
}

export const getListings = async ({ latitude, longitude, radiusMeters, type, category, search, cursor, limit = 20 }) => {
  const { data } = await api.get("/listings", {
    params: { latitude, longitude, radiusMeters, type: type === "all" ? undefined : type, category, search, cursor, limit },
  });
  return data;
};

export const createListing = async (listingData) => {
  const { data } = await api.post("/listings", listingData);
  return data;
};

export const uploadListingMedia = async (listingId, files) => {
  const body = new FormData();
  files.forEach((file) => body.append("files", file));
  const { data } = await api.post(`/listings/${listingId}/media`, body);
  return data;
};

export function resolveMediaUrl(relativeUrl) {
  const apiUrl = new URL(api.defaults.baseURL);
  return new URL(relativeUrl, apiUrl.origin).toString();
}

export const deleteListing = async (id) => {
  const { data } = await api.delete(`/listings/${id}`);
  return data;
};

export async function getMyMemberships() {
  const { data } = await api.get("/communities/mine");
  return data.memberships;
}

export async function getCommunities() {
  const { data } = await api.get("/communities");
  return data.communities;
}

export async function createCommunity(input) {
  const { data } = await api.post("/communities", input);
  return data.community;
}

export async function joinCommunity(communityId) {
  const { data } = await api.post(`/communities/${communityId}/memberships`);
  return data.membership;
}

export async function getCommunityMemberships(communityId, status = "pending") {
  const { data } = await api.get(`/communities/${communityId}/memberships`, { params: { status, limit: 50 } });
  return data.memberships;
}

export async function decideCommunityMembership(communityId, membershipId, action) {
  const { data } = await api.patch(`/communities/${communityId}/memberships/${membershipId}`, { action });
  return data.membership;
}

export async function createRequest(listingId, message, idempotencyKey) {
  const { data } = await api.post("/requests", { listingId, message }, { headers: { "Idempotency-Key": idempotencyKey } });
  return data;
}

export async function getRequests(role, { status, cursor, limit = 20 } = {}) {
  const { data } = await api.get("/requests", { params: { role, status, cursor, limit } });
  return data;
}

export async function transitionRequest(requestId, status, idempotencyKey) {
  const { data } = await api.patch(`/requests/${requestId}/status`, { status }, { headers: { "Idempotency-Key": idempotencyKey } });
  return data;
}

export async function getNotifications({ cursor, limit = 20 } = {}) {
  const { data } = await api.get("/notifications", { params: { cursor, limit } });
  return data;
}

export async function getUnreadNotificationCount() {
  const { data } = await api.get("/notifications/unread-count");
  return data.unreadCount;
}

export async function markNotificationRead(notificationId) {
  const { data } = await api.patch(`/notifications/${notificationId}/read`);
  return data.notification;
}

export async function markAllNotificationsRead() {
  const { data } = await api.patch("/notifications/read-all");
  return data.updatedCount;
}
