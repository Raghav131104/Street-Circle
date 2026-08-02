import { useCallback, useEffect, useMemo, useState } from "react";
import {
  createCommunity,
  decideCommunityMembership,
  getCommunities,
  getCommunityMemberships,
  joinCommunity,
} from "../services/api";

export default function CommunityPanel({ memberships, location, onChanged }) {
  const [communities, setCommunities] = useState([]);
  const [pending, setPending] = useState([]);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ name: "", description: "", coverageRadiusMeters: 5000, joinPolicy: "approval" });
  const membershipByCommunity = useMemo(() => new Map(memberships.map((membership) => [membership.communityId, membership])), [memberships]);
  const moderated = useMemo(() => memberships.filter((membership) => membership.status === "active" && ["owner", "moderator"].includes(membership.role)), [memberships]);

  const refresh = useCallback(async () => {
    setError("");
    try {
      const [available, queues] = await Promise.all([
        getCommunities(),
        Promise.all(moderated.map(async (membership) => ({
          communityId: membership.communityId,
          communityName: membership.community?.name || "Community",
          records: await getCommunityMemberships(membership.communityId),
        }))),
      ]);
      setCommunities(available);
      setPending(queues.flatMap((queue) => queue.records.map((record) => ({ ...record, communityName: queue.communityName }))));
    } catch (requestError) {
      setError(requestError.response?.data?.error?.message || "Communities could not be loaded.");
    }
  }, [moderated]);

  useEffect(() => {
    // The state update occurs after community and moderation queries settle.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh();
  }, [refresh]);

  const run = async (action) => {
    setError("");
    try {
      await action();
      await onChanged();
      await refresh();
    } catch (requestError) {
      setError(requestError.response?.data?.error?.message || "The community action failed.");
    }
  };

  const submit = (event) => {
    event.preventDefault();
    if (!location) {
      setError("Choose a discovery location before creating a community.");
      return;
    }
    void run(async () => {
      await createCommunity({
        ...form,
        ...location,
        coverageRadiusMeters: Number(form.coverageRadiusMeters),
        visibility: "public",
        rules: ["Respect neighbors and describe listings honestly"],
      });
      setForm({ name: "", description: "", coverageRadiusMeters: 5000, joinPolicy: "approval" });
    });
  };

  return <section className="community-panel" aria-labelledby="communities-heading">
    <header><span className="eyebrow">Membership and moderation</span><h2 id="communities-heading">Communities</h2></header>
    {error && <p className="form-error" role="alert">{error}</p>}
    <div className="community-layout">
      <form className="community-create" onSubmit={submit}>
        <h3>Create a community</h3>
        <label htmlFor="community-name">Name</label><input id="community-name" required minLength="3" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })}/>
        <label htmlFor="community-description">Description</label><textarea id="community-description" required minLength="10" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })}/>
        <label htmlFor="community-radius">Coverage radius (metres)</label><input id="community-radius" type="number" min="100" max="50000" required value={form.coverageRadiusMeters} onChange={(event) => setForm({ ...form, coverageRadiusMeters: event.target.value })}/>
        <label htmlFor="community-policy">Join policy</label><select id="community-policy" value={form.joinPolicy} onChange={(event) => setForm({ ...form, joinPolicy: event.target.value })}><option value="approval">Owner approval</option><option value="open">Open</option></select>
        <button type="submit">Create community</button>
      </form>
      <div className="community-available"><h3>Available communities</h3>{communities.map((community) => {
        const membership = membershipByCommunity.get(community.id);
        return <article key={community.id}><div><strong>{community.name}</strong><span>{membership?.status || "available"}</span></div><p>{community.description}</p>{!membership && <button type="button" onClick={() => void run(() => joinCommunity(community.id))}>Request to join</button>}</article>;
      })}{communities.length === 0 && <p className="request-empty">No public communities yet.</p>}</div>
    </div>
    {pending.length > 0 && <div className="membership-queue"><h3>Pending membership reviews</h3>{pending.map((membership) => <article key={membership.id}><span>{membership.communityName}: user {membership.userId.slice(-6)}</span><div><button type="button" onClick={() => void run(() => decideCommunityMembership(membership.communityId, membership.id, "approve"))}>Approve</button><button type="button" onClick={() => void run(() => decideCommunityMembership(membership.communityId, membership.id, "reject"))}>Reject</button></div></article>)}</div>}
  </section>;
}
