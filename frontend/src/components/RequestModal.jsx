import { useState } from "react";

export default function RequestModal({ listing, onClose, onSubmit }) {
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  if (!listing) return null;

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);
    try {
      await onSubmit(listing.id, message);
      onClose();
    } catch (requestError) {
      setError(requestError.response?.data?.error?.message || "The request could not be created.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return <div className="modal-overlay" role="presentation" onMouseDown={onClose}>
    <section className="modal-content" role="dialog" aria-modal="true" aria-labelledby="request-title" onMouseDown={(event) => event.stopPropagation()}>
      <button className="modal-close" type="button" aria-label="Close request dialog" onClick={onClose}>&times;</button>
      <h2 id="request-title">Request {listing.title}</h2>
      <p>The owner can accept or reject this request. Your account identity is supplied by the server session.</p>
      <form onSubmit={submit}>
        <div className="form-group"><label htmlFor="request-message">Message (optional)</label><textarea id="request-message" rows="4" maxLength="1000" value={message} onChange={(event) => setMessage(event.target.value)} /></div>
        {error && <p className="form-error" role="alert">{error}</p>}
        <button className="submit-btn" type="submit" disabled={isSubmitting}>{isSubmitting ? "Sending..." : "Send request"}</button>
      </form>
    </section>
  </div>;
}
