function parseCookies(header = "") {
  return Object.fromEntries(header.split(";").flatMap((part) => {
    const separator = part.indexOf("=");
    if (separator < 1) return [];
    const key = part.slice(0, separator).trim();
    const value = part.slice(separator + 1).trim();
    try { return [[key, decodeURIComponent(value)]]; } catch { return []; }
  }));
}

function sessionCookie(secret, config, expiresAt) {
  const attributes = [
    `${config.SESSION_COOKIE_NAME}=${encodeURIComponent(secret)}`,
    "Path=/api/v1",
    "HttpOnly",
    "SameSite=Lax",
    `Expires=${expiresAt.toUTCString()}`,
  ];
  if (config.NODE_ENV === "production") attributes.push("Secure");
  return attributes.join("; ");
}

function clearSessionCookie(config) {
  return `${config.SESSION_COOKIE_NAME}=; Path=/api/v1; HttpOnly; SameSite=Lax; Max-Age=0${config.NODE_ENV === "production" ? "; Secure" : ""}`;
}

module.exports = { clearSessionCookie, parseCookies, sessionCookie };
