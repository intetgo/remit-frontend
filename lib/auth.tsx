"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { getUser, type User } from "./api";

interface AuthState {
  user: User | null;
  token: string | null;
  authLoading: boolean;
  setAuth: (user: User, token: string) => void;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthState>({
  user: null,
  token: null,
  authLoading: true,
  setAuth: () => {},
  logout: () => {},
  refreshUser: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem("remit_user");
    const storedToken = localStorage.getItem("remit_token");
    if (stored && storedToken) {
      setUser(JSON.parse(stored));
      setToken(storedToken);
    }
    setAuthLoading(false);
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

  async function refreshUser() {
    if (!user) return;
    const updated = await getUser(user.id);
    localStorage.setItem("remit_user", JSON.stringify(updated));
    setUser(updated);
  }

  return (
    <AuthContext.Provider value={{ user, token, authLoading, setAuth, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
