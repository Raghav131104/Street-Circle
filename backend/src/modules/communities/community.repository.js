const mongoose = require("mongoose");
const Community = require("./community.model");
const Membership = require("../memberships/membership.model");

const communityRepository = {
  async createWithOwner(communityData, ownerId) {
    const transaction = await mongoose.startSession();
    try {
      let community;
      await transaction.withTransaction(async () => {
        [community] = await Community.create([communityData], { session: transaction });
        await Membership.create([{
          userId: ownerId, communityId: community._id, role: "owner", status: "active", joinedAt: new Date(),
        }], { session: transaction });
      });
      return community;
    } finally {
      await transaction.endSession();
    }
  },
  findById(id) { return Community.findOne({ _id: id, status: "active" }); },
  listAvailable(limit = 50) {
    return Community.find({ status: "active", visibility: "public" }).sort({ createdAt: -1, _id: -1 }).limit(limit);
  },
  listUserMemberships(userId) {
    return Membership.find({ userId, status: { $in: ["active", "pending"] } })
      .sort({ createdAt: -1 }).populate("communityId");
  },
  findMembership(userId, communityId) { return Membership.findOne({ userId, communityId }); },
  findMembershipById(id) { return Membership.findById(id); },
  listModerators(communityId) {
    return Membership.find({ communityId, status: "active", role: { $in: ["owner", "moderator"] } }).select("userId").lean();
  },
  listMemberships(communityId, status, limit) {
    return Membership.find({ communityId, status }).sort({ createdAt: 1, _id: 1 }).limit(limit).lean();
  },
  createMembership(data) { return Membership.create(data); },
  reactivateMembership(id, status, joinedAt) {
    return Membership.findOneAndUpdate(
      { _id: id, status: { $in: ["left", "rejected"] } },
      { $set: { status, role: "member", joinedAt, decidedAt: null, decidedBy: null } },
      { returnDocument: "after" },
    );
  },
  decideMembership(id, expectedStatus, changes) {
    return Membership.findOneAndUpdate(
      { _id: id, status: expectedStatus }, { $set: changes }, { returnDocument: "after" },
    );
  },
  changeRole(id, role) {
    return Membership.findOneAndUpdate(
      { _id: id, status: "active", role: { $ne: "owner" } }, { $set: { role } }, { returnDocument: "after" },
    );
  },
  leave(id) {
    return Membership.findOneAndUpdate(
      { _id: id, status: "active", role: { $ne: "owner" } },
      { $set: { status: "left" } }, { returnDocument: "after" },
    );
  },
};

module.exports = { communityRepository };
