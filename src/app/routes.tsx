import { createBrowserRouter, Navigate } from "react-router";
import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import Login from "./pages/Login";
import Register from "./pages/Register";
import PoliceDashboard from "./pages/PoliceDashboard.tsx";

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
  if (state === "unauth") return <Navigate to="/login" replace />;
  return <>{children}</>;
};

export const router = createBrowserRouter([
  {
    path: "/",
    element: <Navigate to="/login" replace />,
  },
  {
    path: "/login",
    Component: Login,
  },
  {
    path: "/register",
    Component: Register,
  },
  {
    path: "/police",
    element: (
      <AuthGuard>
        <PoliceDashboard />
      </AuthGuard>
    ),
  },
]);
