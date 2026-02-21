import { createBrowserRouter, Navigate } from "react-router";
import Login from "./pages/Login";
import Register from "./pages/Register";
import RoleSelect from "./pages/RoleSelect";
import PoliceDashboard from "./pages/PoliceDashboard";
import UserDashboard from "./pages/UserDashboard";

// Protected Route wrapper component
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const isAuthenticated = localStorage.getItem("isAuthenticated");
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
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
    path: "/role-select",
    element: (
      <ProtectedRoute>
        <RoleSelect />
      </ProtectedRoute>
    ),
  },
  {
    path: "/police",
    element: (
      <ProtectedRoute>
        <PoliceDashboard />
      </ProtectedRoute>
    ),
  },
  {
    path: "/user",
    element: (
      <ProtectedRoute>
        <UserDashboard />
      </ProtectedRoute>
    ),
  },
]);
