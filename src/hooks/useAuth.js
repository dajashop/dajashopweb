// src/hooks/useAuth.js
// Hook to access authentication context
// and ensure it's used within the provider
// ------------------------------------------------------

import { useContext, useSyncExternalStore } from "react";
import { Ctx } from "../context/AuthContext";
import { getStaffAccessToken, onStaffAccessTokenChange } from "../services/apiClient.js";

export function useAuth() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAuth in provider");
  return v;
}

export function useStaffCatalogScope() {
  const { user, staffReady } = useAuth();
  const staffToken = useSyncExternalStore(onStaffAccessTokenChange, getStaffAccessToken, () => null);
  return staffReady && staffToken && user ? (user.id || user.uid || user.email) : null;
}
