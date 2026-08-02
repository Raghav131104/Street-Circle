const User = require("../../modules/users/user.model");
const Session = require("../../modules/auth/session.model");
const Community = require("../../modules/communities/community.model");
const Membership = require("../../modules/memberships/membership.model");
const Listing = require("../../modules/listings/listing.model");
const Request = require("../../modules/requests/request.model");
const Notification = require("../../modules/notifications/notification.model");
const Report = require("../../modules/moderation/report.model");
const AuditEvent = require("../../modules/moderation/audit-event.model");

const models = { User, Session, Community, Membership, Listing, Request, Notification, Report, AuditEvent };

async function syncIndexes() {
  return Promise.all(Object.values(models).map((model) => model.syncIndexes()));
}

module.exports = { models, syncIndexes };
