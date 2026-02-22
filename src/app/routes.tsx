import { createBrowserRouter, Navigate } from "react-router";
import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import AuthPage from "./pages/AuthPage";
import VictimDashboard from "./pages/VictimDashboard";
import VictimProfile from "./pages/VictimProfile";
import PoliceDashboardNew from "./pages/PoliceDashboardNew";
import AdminDashboard from "./pages/AdminDashboard";
import SOSPage from "./pages/SOSPage";

// Simple auth guard — only checks if the user is signed in.
const AuthGuard = ({ children }: { children: ReactNode }) => {
  const [state, setState] = useState<"loading" | "ok" | "unauth">("loading");

  useEffect(() => {
    const auth = getAuth();
    const unsub = onAuthStateChanged(auth, (user) => {
      setState(user ? "ok" : "unauth");
    });
    return () => unsub();
  }, []);

  if (state === "loading") return null;
  if (state === "unauth") return <Navigate to="/auth" replace />;
  return <>{children}</>;
};

export const router = createBrowserRouter([
  {
    path: "/",
    element: <Navigate to="/auth" replace />,
  },
  {
    path: "/auth",
    Component: AuthPage,
  },
  {
    path: "/victim-dashboard",
    element: (
      <AuthGuard>
        <VictimDashboard />
      </AuthGuard>
    ),
  },
  {
    path: "/victim-profile",
    element: (
      <AuthGuard>
        <VictimProfile />
      </AuthGuard>
    ),
  },
  {
    path: "/sos",
    element: (
      <AuthGuard>
        <SOSPage />
      </AuthGuard>
    ),
  },
  {
    path: "/police-dashboard",
    element: (
      <AuthGuard>
        <PoliceDashboardNew />
      </AuthGuard>
    ),
  },
  {
    path: "/admin-dashboard",
    element: (
      <AuthGuard>
        <AdminDashboard />
      </AuthGuard>
    ),
  },
]);
