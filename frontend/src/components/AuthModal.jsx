import { useContext, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AuthContext } from "../context/auth-context";
import { authenticate } from "../services/api";

function formatAuthenticationError(requestError) {
  const apiError = requestError.response?.data?.error;
  if (Array.isArray(apiError?.details) && apiError.details.length > 0) {
    return apiError.details
      .map((issue) => `${issue.path ? `${issue.path[0].toUpperCase()}${issue.path.slice(1)}: ` : ""}${issue.message}`)
      .join(". ");
  }
  return apiError?.message || "Authentication failed";
}

export default function AuthModal({ isOpen, onClose }) {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({ username: "", password: "", email: "" });
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login } = useContext(AuthContext);
  if (!isOpen) return null;

  const close = () => {
    setIsLogin(true);
    setError("");
    onClose();
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);
    try {
      const data = await authenticate(isLogin ? "login" : "register", formData);
      login(data.user);
      setFormData({ username: "", password: "", email: "" });
      close();
    } catch (requestError) {
      setError(formatAuthenticationError(requestError));
    } finally {
      setIsSubmitting(false);
    }
  };

  return <AnimatePresence>
    <motion.div className="modal-overlay" role="presentation" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={close}>
      <motion.section className="modal-content" role="dialog" aria-modal="true" aria-labelledby="auth-title" initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 50, opacity: 0 }} transition={{ type: "spring", damping: 25, stiffness: 300 }} onMouseDown={(event) => event.stopPropagation()}>
        <button className="modal-close" type="button" aria-label="Close authentication dialog" onClick={close}>&times;</button>
        <h2 id="auth-title" style={{ marginBottom: "8px", color: "#1a1a1a" }}>{isLogin ? "Welcome Back" : "Join StreetCircle"}</h2>
        <p style={{ color: "#666", marginBottom: "24px" }}>{isLogin ? "Log in to post your listings." : "Create an account to join your neighbors."}</p>
        {error && <p className="form-error" role="alert">{error}</p>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="auth-username">{isLogin ? "Username or email" : "Username"}</label>
            <input id="auth-username" type="text" required minLength={isLogin ? undefined : 3} maxLength={isLogin ? 254 : 40} pattern={isLogin ? undefined : "[A-Za-z0-9_]+"} autoComplete="username" aria-describedby={isLogin ? undefined : "auth-username-help"} value={formData.username} onChange={(event) => setFormData({ ...formData, username: event.target.value })}/>
            {!isLogin && <small id="auth-username-help" className="field-help">3–40 characters; use letters, numbers, or underscores.</small>}
          </div>
          {!isLogin && <div className="form-group"><label htmlFor="auth-email">Email</label><input id="auth-email" type="email" required maxLength="254" autoComplete="email" value={formData.email} onChange={(event) => setFormData({ ...formData, email: event.target.value })}/></div>}
          <div className="form-group">
            <label htmlFor="auth-password">Password</label>
            <input id="auth-password" type="password" required minLength={isLogin ? 1 : 10} maxLength="128" autoComplete={isLogin ? "current-password" : "new-password"} aria-describedby={isLogin ? undefined : "auth-password-help"} value={formData.password} onChange={(event) => setFormData({ ...formData, password: event.target.value })}/>
            {!isLogin && <small id="auth-password-help" className="field-help">Use 10–128 characters.</small>}
          </div>
          <button type="submit" disabled={isSubmitting} className="submit-btn" style={{ marginBottom: "16px" }}>{isSubmitting ? "Please wait..." : isLogin ? "Log In" : "Sign Up"}</button>
          <p style={{ textAlign: "center", fontSize: "14px", color: "#666" }}>
            {isLogin ? "Don't have an account? " : "Already have an account? "}
            <button type="button" className="link-button" onClick={() => { setIsLogin(!isLogin); setError(""); }}>{isLogin ? "Sign Up" : "Log In"}</button>
          </p>
        </form>
      </motion.section>
    </motion.div>
  </AnimatePresence>;
}
