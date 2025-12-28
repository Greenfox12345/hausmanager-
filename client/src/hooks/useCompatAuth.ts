import { useHouseholdAuth } from "@/contexts/AuthContext";
import { useUserAuth } from "@/contexts/UserAuthContext";

/**
 * Compatibility hook that works with both old and new auth systems.
 * Prioritizes new user-based auth, falls back to old household-based auth.
 */
export function useCompatAuth() {
  const oldAuth = useHouseholdAuth();
  const newAuth = useUserAuth();

  // If new auth is active and household is selected, use it
  if (newAuth.isAuthenticated && newAuth.currentHousehold) {
    return {
      household: {
        householdId: newAuth.currentHousehold.householdId,
        householdName: newAuth.currentHousehold.householdName,
      },
      member: {
        memberId: 0, // Not used in new system
        memberName: newAuth.currentHousehold.memberName,
        householdId: newAuth.currentHousehold.householdId,
      },
      isAuthenticated: true,
      logout: () => {
        newAuth.logout();
      },
    };
  }

  // Fall back to old auth system
  return {
    household: oldAuth.household,
    member: oldAuth.member,
    isAuthenticated: oldAuth.isAuthenticated,
    logout: oldAuth.logout,
  };
}
