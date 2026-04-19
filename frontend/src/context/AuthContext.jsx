import { createContext, useState, useEffect } from "react";
import axios from "axios";

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem("token") || null);

  useEffect(() => {
    if (token) {
      localStorage.setItem("token", token);
      // In a real app we would verify token or fetch user profile,
      // here we just decode locally if we had to, but API will return 'invalid token' if it's bad.
      // We will parse simple jwt payload to keep track of user ID (or just rely on API response).
      try {
        const payload = JSON.parse(atob(token.split(".")[1]));
        setUser({ id: payload.id }); // basic hydration 
      } catch (e) {
        setToken(null);
        localStorage.removeItem("token");
      }
    } else {
      localStorage.removeItem("token");
      setUser(null);
    }
  }, [token]);

  const login = (newToken, newUser) => {
    setToken(newToken);
    setUser(newUser);
  };

  const logout = () => {
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
