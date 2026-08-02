function RequestRow({ request, role, onTransition }) {
  const actions = role === "owner"
    ? request.status === "PENDING" ? ["ACCEPTED", "REJECTED"] : request.status === "ACCEPTED" ? ["COMPLETED", "CANCELLED"] : []
    : request.status === "PENDING" ? ["CANCELLED"] : request.status === "ACCEPTED" ? ["COMPLETED", "CANCELLED"] : [];
  return <article className="request-row">
    <div><strong>Listing {request.listingId.slice(-6)}</strong><span className={`request-status status-${request.status.toLowerCase()}`}>{request.status}</span></div>
    {request.message && <p>{request.message}</p>}
    <small>Updated {new Date(request.updatedAt).toLocaleString()}</small>
    {actions.length > 0 && <div className="request-actions">{actions.map((status) => <button type="button" key={status} onClick={() => onTransition(request.id, status)}>{status.toLowerCase()}</button>)}</div>}
  </article>;
}

export default function RequestsPanel({ incoming, outgoing, error, onTransition }) {
  return <section className="requests-panel" aria-labelledby="requests-heading">
    <header><span className="eyebrow">Conflict-safe workflow</span><h2 id="requests-heading">Requests</h2>{error && <p className="form-error" role="alert">{error}</p>}</header>
    <div className="request-columns">
      <div><h3>Incoming</h3>{incoming.length ? incoming.map((request) => <RequestRow key={request.id} request={request} role="owner" onTransition={onTransition}/>) : <p className="request-empty">No incoming requests.</p>}</div>
      <div><h3>Outgoing</h3>{outgoing.length ? outgoing.map((request) => <RequestRow key={request.id} request={request} role="requester" onTransition={onTransition}/>) : <p className="request-empty">No outgoing requests.</p>}</div>
    </div>
  </section>;
}
