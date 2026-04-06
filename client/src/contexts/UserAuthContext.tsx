import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { trpc } from "@/lib/trpc";

interface User {
  id: number;
  email: string | null;
  name: string;
  role?: "user" | "admin";
}

interface CurrentHousehold {
  householdId: number;
  householdName: string;
  memberId: number;
  memberName: string;
  inviteCode?: string | null;
}

interface UserAuthContextType {
  user: User | null;
  currentHousehold: CurrentHousehold | null;
  token: string | null;
  isAuthenticated: boolean;
  isDemoSession: boolean;
  isLoading: boolean;
  login: (token: string) => void;
  logout: () => void;
  setCurrentHousehold: (household: CurrentHousehold) => void;
}

const UserAuthContext = createContext<UserAuthContextType | undefined>(undefined);

/** Decode a JWT payload without verifying the signature (client-side only). */
function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const payload = atob(parts[1].replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(payload);
  } catch {
    return null;
  }
}

/** Check whether a stored auth_token is a demo JWT. */
function checkIsDemoToken(token: string | null): boolean {
  if (!token) return false;
  try {
    const payload = decodeJwtPayload(token);
    return !!(payload && payload.isDemo === true);
  } catch {
    return false;
  }
}

export function UserAuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem("auth_token");
  });

  const [currentHousehold, setCurrentHouseholdState] = useState<CurrentHousehold | null>(() => {
    const stored = localStorage.getItem("current_household");
    return stored ? JSON.parse(stored) : null;
  });

  // isDemoSession: true when the stored auth_token is a demo JWT
  const [isDemoSession, setIsDemoSession] = useState<boolean>(() => checkIsDemoToken(localStorage.getItem("auth_token")));

  // Re-evaluate isDemoSession whenever token changes or demo-session-changed event fires
  useEffect(() => {
    setIsDemoSession(checkIsDemoToken(token));
  }, [token]);

  useEffect(() => {
    const checkDemo = () => {
      const currentToken = localStorage.getItem("auth_token");
      setIsDemoSession(checkIsDemoToken(currentToken));
    };
    window.addEventListener("demo-session-changed", checkDemo);
    return () => window.removeEventListener("demo-session-changed", checkDemo);
  }, []);

  // Get current user from backend – skip for demo sessions (backend returns synthetic user)
  const { data: user, isLoading } = trpc.userAuth.getCurrentUser.useQuery(
    { token: token || undefined },
    {
      enabled: !!token && !isDemoSession,
      retry: false,
    }
  );

  const login = (newToken: string) => {
    setToken(newToken);
    localStorage.setItem("auth_token", newToken);
  };

  const logout = () => {
    setToken(null);
    setCurrentHouseholdState(null);
    setIsDemoSession(false);
    localStorage.removeItem("auth_token");
    localStorage.removeItem("current_household");
    localStorage.removeItem("demo_token");
    localStorage.removeItem("demo_expires_at");
  };

  const setCurrentHousehold = (household: CurrentHousehold) => {
    setCurrentHouseholdState(household);
    localStorage.setItem("current_household", JSON.stringify(household));
  };

  // Demo sessions are authenticated via the JWT bearer token.
  // Regular sessions need a valid token + user from backend.
  // While the user query is loading (isLoading=true), treat the session as authenticated
  // if a token is present – this prevents a brief flash to /login after claim.
  const isAuthenticated = isDemoSession
    ? !!token
    : (!!token && (!!user || isLoading));

  // For demo sessions, create a synthetic user object so components that read user.name don't crash.
  const effectiveUser: User | null = isDemoSession
    ? { id: 0, email: null, name: "Demo", role: "user" }
    : (user || null);

  return (
    <UserAuthContext.Provider
      value={{
        user: effectiveUser,
        currentHousehold,
        token,
        isAuthenticated,
        isDemoSession,
        isLoading: isDemoSession ? false : isLoading,
        login,
        logout,
        setCurrentHousehold,
      }}
    >
      {children}
    </UserAuthContext.Provider>
  );
}

export function useUserAuth() {
  const context = useContext(UserAuthContext);
  if (context === undefined) {
    throw new Error("useUserAuth must be used within a UserAuthProvider");
  }
  return context;
}
