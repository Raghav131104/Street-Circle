import { useState } from "react";

export default function LocationControl({ status, location, error, onRetry, onManual }) {
  const [latitude, setLatitude] = useState(location?.latitude ?? "");
  const [longitude, setLongitude] = useState(location?.longitude ?? "");

  const submit = (event) => {
    event.preventDefault();
    onManual({ latitude: Number(latitude), longitude: Number(longitude) });
  };

  const statusLabel = status === "ready"
    ? "Location ready"
    : status === "requesting"
      ? "Requesting permission..."
      : "Manual location required";

  return <section className="location-control" aria-live="polite">
    <div><span>Discovery location</span><strong>{statusLabel}</strong>{error && <small>{error}</small>}</div>
    <button type="button" onClick={onRetry}>Use browser location</button>
    <form onSubmit={submit}>
      <label><span>Latitude</span><input required type="number" step="any" min="-90" max="90" value={latitude} onChange={(event) => setLatitude(event.target.value)}/></label>
      <label><span>Longitude</span><input required type="number" step="any" min="-180" max="180" value={longitude} onChange={(event) => setLongitude(event.target.value)}/></label>
      <button type="submit">Use manual</button>
    </form>
  </section>;
}
