import { useEffect, useState } from "react";
import { AuthContext } from "./auth-context";
import { getAuthenticatedUser, revokeSession } from "../services/api";

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    let active = true;
    getAuthenticatedUser()
      .then((authenticatedUser) => { if (active) setUser(authenticatedUser); })
      .catch(() => { if (active) setUser(null); })
      .finally(() => { if (active) setIsInitializing(false); });
    return () => { active = false; };
  }, []);

  const login = (newUser) => {
    setUser(newUser);
  };
  const logout = async () => {
    try { await revokeSession(); }
    finally { setUser(null); }
  };
  return (
    <AuthContext.Provider value={{ user, login, logout, isInitializing }}>
      {isInitializing ? null : children}
    </AuthContext.Provider>
  );
};
