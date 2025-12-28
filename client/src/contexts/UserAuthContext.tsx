import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { trpc } from "@/lib/trpc";

interface User {
  id: number;
  email: string;
  name: string;
}

interface CurrentHousehold {
  householdId: number;
  householdName: string;
  memberName: string;
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
  const { data: user, isLoading } = trpc.userAuth.getCurrentUser.useQuery(undefined, {
    enabled: !!token,
    retry: false,
  });

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

  const isAuthenticated = !!token && !!user;

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
