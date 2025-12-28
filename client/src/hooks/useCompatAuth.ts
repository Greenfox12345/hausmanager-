import { useUserAuth } from "@/contexts/UserAuthContext";

/**
 * Auth hook that provides household and member information.
 * Uses the new user-based authentication system.
 */
export function useCompatAuth() {
  const auth = useUserAuth();

  // If user is authenticated and household is selected, return data
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
      logout: () => {
        auth.logout();
      },
    };
  }

  // Return null values if not authenticated
  return {
    household: null,
    member: null,
    isAuthenticated: false,
    logout: () => {
      auth.logout();
    },
  };
}
