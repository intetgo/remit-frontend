"use client";

import { createContext, useContext, useEffect, useState } from "react";
import type { User } from "./api";

interface AuthState {
  user: User | null;
  token: string | null;
  setAuth: (user: User, token: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthState>({
  user: null,
  token: null,
  setAuth: () => {},
  logout: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem("remit_user");
    const storedToken = localStorage.getItem("remit_token");
    if (stored && storedToken) {
      setUser(JSON.parse(stored));
      setToken(storedToken);
    }
  }, []);

  function setAuth(u: User, t: string) {
    localStorage.setItem("remit_user", JSON.stringify(u));
    localStorage.setItem("remit_token", t);
    setUser(u);
    setToken(t);
  }

  function logout() {
    localStorage.removeItem("remit_user");
    localStorage.removeItem("remit_token");
    setUser(null);
    setToken(null);
  }

  return (
    <AuthContext.Provider value={{ user, token, setAuth, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
