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
  isLoading: boolean;
  login: (token: string) => void;
  logout: () => void;
  setCurrentHousehold: (household: CurrentHousehold) => void;
}

const UserAuthContext = createContext<UserAuthContextType | undefined>(undefined);

export function UserAuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem("auth_token");
  });

  const [currentHousehold, setCurrentHouseholdState] = useState<CurrentHousehold | null>(() => {
    const stored = localStorage.getItem("current_household");
    return stored ? JSON.parse(stored) : null;
  });

  // Get current user from backend
  const { data: user, isLoading } = trpc.userAuth.getCurrentUser.useQuery(
    { token: token || undefined },
    {
      enabled: !!token,
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
    localStorage.removeItem("auth_token");
    localStorage.removeItem("current_household");
  };

  const setCurrentHousehold = (household: CurrentHousehold) => {
    setCurrentHouseholdState(household);
    localStorage.setItem("current_household", JSON.stringify(household));
  };

  // Demo session: track in state so React re-renders when demo_token is set
  const [isDemoSession, setIsDemoSession] = useState<boolean>(() => {
    try {
      const demoToken = localStorage.getItem("demo_token");
      const demoExpiresAt = localStorage.getItem("demo_expires_at");
      return !!(demoToken && demoExpiresAt && new Date(demoExpiresAt) > new Date());
    } catch {
      return false;
    }
  });

  // Listen for storage changes (demo_token set/removed in same tab via custom event)
  useEffect(() => {
    const checkDemo = () => {
      try {
        const demoToken = localStorage.getItem("demo_token");
        const demoExpiresAt = localStorage.getItem("demo_expires_at");
        setIsDemoSession(!!(demoToken && demoExpiresAt && new Date(demoExpiresAt) > new Date()));
      } catch {
        setIsDemoSession(false);
      }
    };
    window.addEventListener("demo-session-changed", checkDemo);
    return () => window.removeEventListener("demo-session-changed", checkDemo);
  }, []);

  const isAuthenticated = (!!token && !!user) || isDemoSession;

  return (
    <UserAuthContext.Provider
      value={{
        user: user || null,
        currentHousehold,
        token,
        isAuthenticated,
        isLoading,
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
