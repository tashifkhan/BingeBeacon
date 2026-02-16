"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { api, unwrap } from "@/lib/api";
import {
  getAccessToken,
  getRefreshToken,
  setTokens,
  clearTokens,
  isAuthenticated as checkAuth,
  isTokenExpired,
} from "@/lib/auth";
import type {
  TokenPair,
  UserProfile,
  LoginRequest,
  RegisterRequest,
} from "@/types";

interface AuthState {
  user: UserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

interface AuthActions {
  login: (req: LoginRequest) => Promise<void>;
  register: (req: RegisterRequest) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

type AuthContextValue = AuthState & AuthActions;

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true,
  });

  // On mount: check if we have a valid token and fetch user profile
  useEffect(() => {
    async function init() {
      if (!checkAuth()) {
        setState({ user: null, isAuthenticated: false, isLoading: false });
        return;
      }

      const token = getAccessToken();
      if (token && isTokenExpired(token)) {
        // Try to refresh
        const refreshToken = getRefreshToken();
        if (refreshToken) {
          try {
            const tokens = await unwrap<TokenPair>(
              api.post("/auth/refresh", { refresh_token: refreshToken })
            );
            setTokens(tokens.access_token, tokens.refresh_token);
          } catch {
            clearTokens();
            setState({ user: null, isAuthenticated: false, isLoading: false });
            return;
          }
        } else {
          clearTokens();
          setState({ user: null, isAuthenticated: false, isLoading: false });
          return;
        }
      }

      try {
        const profile = await unwrap<UserProfile>(api.get("/me"));
        setState({ user: profile, isAuthenticated: true, isLoading: false });
      } catch {
        clearTokens();
        setState({ user: null, isAuthenticated: false, isLoading: false });
      }
    }

    init();
  }, []);

  async function login(req: LoginRequest): Promise<void> {
    const tokens = await unwrap<TokenPair>(api.post("/auth/login", req));
    setTokens(tokens.access_token, tokens.refresh_token);
    const profile = await unwrap<UserProfile>(api.get("/me"));
    setState({ user: profile, isAuthenticated: true, isLoading: false });
  }

  async function register(req: RegisterRequest): Promise<void> {
    const tokens = await unwrap<TokenPair>(api.post("/auth/register", req));
    setTokens(tokens.access_token, tokens.refresh_token);
    const profile = await unwrap<UserProfile>(api.get("/me"));
    setState({ user: profile, isAuthenticated: true, isLoading: false });
  }

  async function logout(): Promise<void> {
    const refreshToken = getRefreshToken();
    try {
      if (refreshToken) {
        await api.post("/auth/logout", { refresh_token: refreshToken });
      }
    } catch {
      // Ignore logout errors
    } finally {
      clearTokens();
      setState({ user: null, isAuthenticated: false, isLoading: false });
    }
  }

  async function refreshUser(): Promise<void> {
    try {
      const profile = await unwrap<UserProfile>(api.get("/me"));
      setState((prev) => ({ ...prev, user: profile }));
    } catch {
      // Silently fail
    }
  }

  return (
    <AuthContext.Provider
      value={{ ...state, login, register, logout, refreshUser }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}
