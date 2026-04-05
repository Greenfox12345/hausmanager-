import { useUserAuth } from "@/contexts/UserAuthContext";

/**
 * Auth hook that provides household and member information.
 * Supports both regular user sessions and demo sessions.
 *
 * Demo sessions: isDemoSession flag is set in UserAuthContext when the
 * stored auth_token is a demo JWT. The demo JWT is sent as a Bearer header
 * so the server can identify the demo user.
 */
export function useCompatAuth() {
  const auth = useUserAuth();

  // If authenticated (regular or demo) and household is selected, return data
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
      isDemoSession: auth.isDemoSession,
      logout: () => {
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
      window.location.href = "/login";
    },
  };
}
