import { createContext, useState } from "react";

export const AuthContext = createContext();

const readUser = () => {
  try { return JSON.parse(localStorage.getItem("streetcircle_user")); }
  catch { return null; }
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(readUser);
  const login = (newUser) => {
    localStorage.setItem("streetcircle_user", JSON.stringify(newUser));
    setUser(newUser);
  };
  const logout = () => {
    localStorage.removeItem("streetcircle_user");
    setUser(null);
  };
  return <AuthContext.Provider value={{ user, login, logout }}>{children}</AuthContext.Provider>;
};