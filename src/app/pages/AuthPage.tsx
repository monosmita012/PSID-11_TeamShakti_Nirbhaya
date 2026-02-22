import { useState } from "react";
import { useNavigate } from "react-router";
import { Shield, Mail, Lock, User, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Button } from "../components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile, getAuth } from "firebase/auth";
import { ref, set } from "firebase/database";
import { auth, database } from "../firebase-config";

interface User {
  role: string;
  email: string;
}

export default function AuthPage() {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const mapAuthError = (code: string) => {
    switch (code) {
      case "auth/email-already-in-use":
        return "Email already registered. Please sign in.";
      case "auth/invalid-email":
        return "Please enter a valid email address.";
      case "auth/operation-not-allowed":
        return "Email/password sign-in is not enabled.";
      case "auth/weak-password":
        return "Password must be at least 6 characters.";
      case "auth/user-not-found":
        return "No account found with this email.";
      case "auth/wrong-password":
        return "Incorrect password.";
      default:
        return "Authentication failed. Please try again.";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (isLogin) {
        // Login
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const userRef = ref(database, `users/${userCredential.user.uid}`);
        
        // Check user role and redirect accordingly
        const response = await fetch(`${import.meta.env.VITE_FIREBASE_DATABASE_URL}/users/${userCredential.user.uid}.json`);
        const userData = await response.json();
        
        if (userData?.role === 'police') {
          navigate('/police-dashboard');
        } else {
          navigate('/victim-dashboard');
        }
      } else {
        // Registration
        if (!role) {
          setError("Please select a role (Victim or Police)");
          setLoading(false);
          return;
        }

        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        
        // Save user role to database
        await set(ref(database, `users/${userCredential.user.uid}`), {
          role: role,
          email: email,
          createdAt: new Date().toISOString()
        });

        // Update profile
        await updateProfile(userCredential.user, {
          displayName: role.charAt(0).toUpperCase() + role.slice(1)
        });

        // Redirect to appropriate dashboard
        if (role === 'police') {
          navigate('/police-dashboard');
        } else {
          navigate('/victim-dashboard');
        }
      }
    } catch (error: any) {
      setError(mapAuthError(error.code));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-pink-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
            <Shield className="w-6 h-6 text-red-600" />
          </div>
          <CardTitle className="text-2xl font-bold text-gray-900">
            Women Safety System
          </CardTitle>
          <CardDescription>
            {isLogin ? "Sign in to your account" : "Create a new account"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
            </div>

            {!isLogin && (
              <div className="space-y-2">
                <Label htmlFor="role">Select Your Role</Label>
                <Select value={role} onValueChange={setRole} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Select your role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="victim">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4" />
                        Victim
                      </div>
                    </SelectItem>
                    <SelectItem value="police">
                      <div className="flex items-center gap-2">
                        <Shield className="w-4 h-4" />
                        Police Officer
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-md">
                <AlertTriangle className="w-4 h-4 text-red-600" />
                <span className="text-sm text-red-700">{error}</span>
              </div>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Please wait..." : isLogin ? "Sign In" : "Sign Up"}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => {
                setIsLogin(!isLogin);
                setError("");
              }}
              className="text-sm text-red-600 hover:text-red-700 font-medium"
            >
              {isLogin 
                ? "Don't have an account? Sign up" 
                : "Already have an account? Sign in"
              }
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
