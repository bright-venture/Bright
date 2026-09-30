import { useEffect } from "react";
import { useNavigate } from "react-router";
import { HOME_BY_ROLE, type Role } from "@contracts/roles";
import { useAuth } from "./useAuth";

/**
 * Keeps each role in its own area: a signed-in user whose role isn't allowed on
 * this page is sent to their home (specialist → dashboard, technician → jobs,
 * customer → my requests). Visitors are left alone unless `requireSignIn`.
 */
export function useRoleGate(allowed: readonly Role[], { requireSignIn = false } = {}) {
  const auth = useAuth({ redirectOnUnauthenticated: requireSignIn });
  const navigate = useNavigate();
  const role = auth.user?.role as Role | undefined;
  const wrongRole = !!role && !allowed.includes(role);

  useEffect(() => {
    if (role && wrongRole) navigate(HOME_BY_ROLE[role], { replace: true });
  }, [role, wrongRole, navigate]);

  return { ...auth, role, wrongRole };
}
