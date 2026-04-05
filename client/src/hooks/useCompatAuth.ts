import { useUserAuth } from "@/contexts/UserAuthContext";

/**
 * Auth hook that provides household and member information.
 * Supports both regular user sessions and demo sessions.
 *
 * Demo sessions: no OAuth user, but currentHousehold is set via localStorage
 * and the demo_token is still valid.
 */
export function useCompatAuth() {
  const auth = useUserAuth();

  // Check for active demo session
  const isDemoSession = (() => {
    try {
      const demoToken = localStorage.getItem("demo_token");
      const demoExpiresAt = localStorage.getItem("demo_expires_at");
      return !!(demoToken && demoExpiresAt && new Date(demoExpiresAt) > new Date());
    } catch {
      return false;
    }
  })();

  // If user is authenticated (OAuth/internal) and household is selected, return data
  if (auth.isAuthenticated && auth.currentHousehold) {
    return {
      household: {
        householdId: auth.currentHousehold.householdId,
        householdName: auth.currentHousehold.householdName,
        inviteCode: auth.currentHousehold.inviteCode,
      },
      member: {
        memberId: auth.currentHousehold.memberId,
        memberName: auth.currentHousehold.memberName,
        householdId: auth.currentHousehold.householdId,
      },
      isAuthenticated: true,
      isDemoSession: false,
      logout: () => {
        auth.logout();
      },
    };
  }

  // Demo session: no OAuth user, but household is set via setCurrentHousehold
  if (isDemoSession && auth.currentHousehold) {
    return {
      household: {
        householdId: auth.currentHousehold.householdId,
        householdName: auth.currentHousehold.householdName,
        inviteCode: auth.currentHousehold.inviteCode,
      },
      member: {
        memberId: auth.currentHousehold.memberId,
        memberName: auth.currentHousehold.memberName,
        householdId: auth.currentHousehold.householdId,
      },
      isAuthenticated: true,
      isDemoSession: true,
      logout: () => {
        localStorage.removeItem("demo_token");
        localStorage.removeItem("demo_expires_at");
        auth.logout();
        window.location.href = "/login";
      },
    };
  }

  // Return null values if not authenticated
  return {
    household: null,
    member: null,
    isAuthenticated: false,
    isDemoSession: false,
    logout: () => {
      auth.logout();
    },
  };
}
