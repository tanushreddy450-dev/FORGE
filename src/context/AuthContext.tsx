import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
import { getToken, setToken, clearToken, fetchMe, login as apiLogin, register as apiRegister } from "@/lib/api";

type User = {
  id: string;
  email: string;
  username: string;
  full_name: string;
  college?: string | null;
  bio?: string | null;
  avatar_url?: string | null;
};

type AuthContextType = {
  user: User | null;
  token: string | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: { email: string; username: string; full_name: string; password: string; college?: string }) => Promise<void>;
  logout: () => void;
  refresh: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | null>(null);

function isTokenExpired(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split(".")[1] ?? ""));
    if (!payload.exp) return false;
    const now = Math.floor(Date.now() / 1000);
    return payload.exp < now;
  } catch {
    return false; // if we can't parse, let server decide
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setTokenState] = useState<string | null>(() => {
    const t = getToken();
    if (t && isTokenExpired(t)) {
      clearToken();
      return null;
    }
    return t;
  });
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const t = getToken();
    if (!t || isTokenExpired(t)) {
      if (t && isTokenExpired(t)) clearToken();
      setUser(null);
      setTokenState(null);
      setLoading(false);
      return;
    }
    try {
      const me = (await fetchMe()) as User;
      setUser(me);
      setTokenState(t);
    } catch {
      clearToken();
      setUser(null);
      setTokenState(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const login = async (email: string, password: string) => {
    const res = (await apiLogin({ email, password })) as { data: { user: User; access_token: string } };
    setToken(res.data.access_token);
    setTokenState(res.data.access_token);
    setUser(res.data.user);
  };

  const register = async (data: { email: string; username: string; full_name: string; password: string; college?: string }) => {
    const res = (await apiRegister(data)) as { data: { user: User; access_token: string } };
    setToken(res.data.access_token);
    setTokenState(res.data.access_token);
    setUser(res.data.user);
  };

  const logout = useCallback(() => {
    clearToken();
    setUser(null);
    setTokenState(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, loading, isAuthenticated: !!user && !!token, login, register, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
