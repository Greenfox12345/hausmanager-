import { createContext, useContext, useState, useEffect, ReactNode } from "react";

interface HouseholdSession {
  householdId: number;
  householdName: string;
}

interface MemberSession {
  memberId: number;
  memberName: string;
  householdId: number;
  photoUrl?: string;
}

interface AuthContextType {
  household: HouseholdSession | null;
  member: MemberSession | null;
  setHousehold: (household: HouseholdSession | null) => void;
  setMember: (member: MemberSession | null) => void;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [household, setHouseholdState] = useState<HouseholdSession | null>(() => {
    const stored = localStorage.getItem("household");
    return stored ? JSON.parse(stored) : null;
  });

  const [member, setMemberState] = useState<MemberSession | null>(() => {
    const stored = localStorage.getItem("member");
    return stored ? JSON.parse(stored) : null;
  });

  const setHousehold = (household: HouseholdSession | null) => {
    setHouseholdState(household);
    if (household) {
      localStorage.setItem("household", JSON.stringify(household));
    } else {
      localStorage.removeItem("household");
    }
  };

  const setMember = (member: MemberSession | null) => {
    setMemberState(member);
    if (member) {
      localStorage.setItem("member", JSON.stringify(member));
    } else {
      localStorage.removeItem("member");
    }
  };

  const logout = () => {
    setHouseholdState(null);
    setMemberState(null);
    localStorage.removeItem("household");
    localStorage.removeItem("member");
  };

  const isAuthenticated = !!household && !!member;

  return (
    <AuthContext.Provider
      value={{
        household,
        member,
        setHousehold,
        setMember,
        logout,
        isAuthenticated,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useHouseholdAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useHouseholdAuth must be used within an AuthProvider");
  }
  return context;
}
