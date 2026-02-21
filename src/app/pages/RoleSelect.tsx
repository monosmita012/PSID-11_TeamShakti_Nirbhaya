import { useNavigate } from "react-router";
import { Shield, User, LogOut } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { useEffect, useState } from "react";

export default function RoleSelect() {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    const isAuthenticated = localStorage.getItem("isAuthenticated");
    if (!isAuthenticated) {
      navigate("/login");
      return;
    }

    const user = JSON.parse(localStorage.getItem("currentUser") || "{}");
    setCurrentUser(user);
  }, [navigate]);

  const handleRoleSelect = (role: "user" | "police") => {
    if (role === "police") {
      navigate("/police");
    } else {
      navigate("/user");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("isAuthenticated");
    localStorage.removeItem("currentUser");
    navigate("/login");
  };

  if (!currentUser) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-4xl w-full">
        <div className="text-center mb-8">
          <h1 className="text-4xl mb-2">Welcome, {currentUser.name}!</h1>
          <p className="text-gray-600">Select your dashboard to continue</p>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleLogout}
            className="mt-4"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </Button>
        </div>
        
        <div className="grid md:grid-cols-2 gap-8">
          <button 
            onClick={() => handleRoleSelect("police")}
            className="group text-left"
          >
            <Card className="h-full transition-all hover:shadow-xl hover:-translate-y-1">
              <CardHeader className="text-center">
                <div className="mx-auto mb-4 w-20 h-20 bg-blue-600 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Shield className="w-10 h-10 text-white" />
                </div>
                <CardTitle className="text-2xl">Police Dashboard</CardTitle>
                <CardDescription>
                  Access incident reports, case management, and analytics
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li>• View active incidents</li>
                  <li>• Manage cases</li>
                  <li>• Analytics and reports</li>
                  <li>• Real-time updates</li>
                </ul>
              </CardContent>
            </Card>
          </button>

          <button 
            onClick={() => handleRoleSelect("user")}
            className="group text-left"
          >
            <Card className="h-full transition-all hover:shadow-xl hover:-translate-y-1">
              <CardHeader className="text-center">
                <div className="mx-auto mb-4 w-20 h-20 bg-green-600 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                  <User className="w-10 h-10 text-white" />
                </div>
                <CardTitle className="text-2xl">User Dashboard</CardTitle>
                <CardDescription>
                  Report incidents, track status, and view safety information
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li>• Report incidents</li>
                  <li>• Track submissions</li>
                  <li>• Safety alerts</li>
                  <li>• Community updates</li>
                </ul>
              </CardContent>
            </Card>
          </button>
        </div>
      </div>
    </div>
  );
}
