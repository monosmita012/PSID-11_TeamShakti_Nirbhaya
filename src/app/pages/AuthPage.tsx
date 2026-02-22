import { useState } from "react";
import { useNavigate } from "react-router";
import { Shield, Mail, Lock, User, AlertTriangle, Phone, UserCircle, MapPin, Building2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Button } from "../components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile, getAuth } from "firebase/auth";
import { ref, set } from "firebase/database";
import { auth, database } from "../firebase-config";

export default function AuthPage() {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [age, setAge] = useState("");
  const [guardianName, setGuardianName] = useState("");
  const [guardianPhone, setGuardianPhone] = useState("");
  // Police specific fields
  const [badgeNumber, setBadgeNumber] = useState("");
  const [area, setArea] = useState("");
  const [policeStation, setPoliceStation] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const mapAuthError = (code: string) => {
    console.log('🔍 Authentication error code:', code);
    
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
      case "auth/network-request-failed":
        return "Network error. Please check your internet connection.";
      case "auth/too-many-requests":
        return "Too many attempts. Please try again later.";
      case "auth/invalid-api-key":
        return "Firebase configuration error. Please check API keys.";
      default:
        console.error('❌ Unknown auth error:', code);
        return `Authentication failed (${code}). Please try again.`;
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

        // Role-specific validation
        if (role === 'victim') {
          if (!name.trim()) {
            setError("Please enter your name");
            setLoading(false);
            return;
          }
          if (!phone.trim()) {
            setError("Please enter your phone number");
            setLoading(false);
            return;
          }
          if (!age.trim()) {
            setError("Please enter your age");
            setLoading(false);
            return;
          }
          if (!guardianName.trim()) {
            setError("Please enter guardian name");
            setLoading(false);
            return;
          }
          if (!guardianPhone.trim()) {
            setError("Please enter guardian phone number");
            setLoading(false);
            return;
          }
        } else if (role === 'police') {
          if (!name.trim()) {
            setError("Please enter your name");
            setLoading(false);
            return;
          }
          if (!phone.trim()) {
            setError("Please enter your phone number");
            setLoading(false);
            return;
          }
          if (!badgeNumber.trim()) {
            setError("Please enter your badge number");
            setLoading(false);
            return;
          }
          if (!area.trim()) {
            setError("Please enter your area/jurisdiction");
            setLoading(false);
            return;
          }
          if (!policeStation.trim()) {
            setError("Please enter your police station name");
            setLoading(false);
            return;
          }
        }

        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        
        // Prepare user data based on role
        let userData: any = {
          role,
          email,
          name: name.trim(),
          phone: phone.trim(),
          createdAt: new Date().toISOString()
        };

        if (role === 'victim') {
          userData = {
            ...userData,
            age: age.trim(),
            guardianName: guardianName.trim(),
            guardianPhone: guardianPhone.trim()
          };
        } else if (role === 'police') {
          userData = {
            ...userData,
            badgeNumber: badgeNumber.trim(),
            area: area.trim(),
            policeStation: policeStation.trim()
          };
        }
        
        await set(ref(database, `users/${userCredential.user.uid}`), userData);

        await updateProfile(userCredential.user, {
          displayName: name.trim()
        });

        if (role === 'police') {
          navigate('/police-dashboard');
        } else {
          navigate('/victim-dashboard');
        }
      }
    } catch (error: any) {
      console.error('❌ Authentication error details:', error);
      console.error('❌ Error code:', error.code);
      console.error('❌ Error message:', error.message);
      setError(mapAuthError(error.code));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-pink-50 to-purple-50 flex items-center justify-center p-4 safe-area-top safe-area-bottom">
      <div className="w-full max-w-lg mx-auto lg:max-w-xl">
        <Card className="card-responsive shadow-2xl border-0 backdrop-blur-sm bg-white/95">
          <CardHeader className="text-center space-y-6 pb-8">
            <div className="mx-auto w-20 h-20 bg-gradient-to-r from-red-500 to-pink-500 rounded-full flex items-center justify-center shadow-2xl animate-mobile hover:scale-105">
              <Shield className="w-10 h-10 text-white" />
            </div>
            <div className="space-y-3">
              <CardTitle className="text-3xl sm:text-4xl lg:text-5xl font-bold bg-gradient-to-r from-red-600 to-pink-600 bg-clip-text text-transparent">
                Women Safety System
              </CardTitle>
              <CardDescription className="text-base lg:text-lg text-gray-600">
                {isLogin ? "Sign in to your account" : "Create a new account"}
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-4">
                <Label htmlFor="email" className="text-base font-medium text-gray-700">Email</Label>
                <div className="relative group">
                  <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-red-500 transition-colors" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-12 h-14 text-base border-gray-200 rounded-xl focus:border-red-500 focus:ring-red-500/20 transition-all"
                    required
                  />
                </div>
              </div>

              <div className="space-y-4">
                <Label htmlFor="password" className="text-base font-medium text-gray-700">Password</Label>
                <div className="relative group">
                  <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-red-500 transition-colors" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-12 h-14 text-base border-gray-200 rounded-xl focus:border-red-500 focus:ring-red-500/20 transition-all"
                    required
                  />
                </div>
              </div>

              {!isLogin && (
                <>
                {/* STEP 1: Role Selection - Always shown first */}
                <div className="space-y-4">
                  <Label htmlFor="role" className="text-base font-medium text-gray-700">Select Your Role</Label>
                  <Select value={role} onValueChange={(value) => {
                    setRole(value);
                    // Clear previous form data when switching roles
                    setName("");
                    setPhone("");
                    setAge("");
                    setGuardianName("");
                    setGuardianPhone("");
                    setBadgeNumber("");
                    setArea("");
                    setPoliceStation("");
                  }} required>
                    <SelectTrigger className="h-14 text-base border-gray-200 rounded-xl focus:border-red-500 focus:ring-red-500/20">
                      <SelectValue placeholder="Select your role" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-gray-200">
                      <SelectItem value="victim" className="rounded-lg p-4">
                        <div className="flex items-center gap-4 p-2">
                          <User className="w-6 h-6 text-red-500" />
                          <div>
                            <div className="font-semibold text-base">Victim</div>
                            <div className="text-sm text-gray-500">Get help and support</div>
                          </div>
                        </div>
                      </SelectItem>
                      <SelectItem value="police" className="rounded-lg p-4">
                        <div className="flex items-center gap-4 p-2">
                          <Shield className="w-6 h-6 text-blue-500" />
                          <div>
                            <div className="font-semibold text-base">Police Officer</div>
                            <div className="text-sm text-gray-500">Respond to emergencies</div>
                          </div>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* STEP 2: Common Fields (for both roles) */}
                {role && (
                  <>
                  <div className="pt-4 border-t border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">
                      {role === 'victim' ? 'Victim Information' : 'Police Officer Information'}
                    </h3>
                  </div>

                  <div className="space-y-4">
                    <Label htmlFor="name" className="text-base font-medium text-gray-700">Full Name</Label>
                    <div className="relative group">
                      <User className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-red-500 transition-colors" />
                      <Input
                        id="name"
                        type="text"
                        placeholder="Enter your full name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="pl-12 h-14 text-base border-gray-200 rounded-xl focus:border-red-500"
                        required={!isLogin}
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <Label htmlFor="phone" className="text-base font-medium text-gray-700">Phone Number</Label>
                    <div className="relative group">
                      <Phone className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-red-500 transition-colors" />
                      <Input
                        id="phone"
                        type="tel"
                        placeholder="Enter your phone number"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="pl-12 h-14 text-base border-gray-200 rounded-xl focus:border-red-500"
                        required={!isLogin}
                      />
                    </div>
                  </div>

                  {/* VICTIM SPECIFIC FIELDS */}
                  {role === 'victim' && (
                    <>
                    <div className="space-y-4">
                      <Label htmlFor="age" className="text-base font-medium text-gray-700">Age</Label>
                      <Input
                        id="age"
                        type="number"
                        min="1"
                        max="120"
                        placeholder="Enter your age"
                        value={age}
                        onChange={(e) => setAge(e.target.value)}
                        className="h-14 text-base border-gray-200 rounded-xl focus:border-red-500"
                        required={!isLogin}
                      />
                    </div>
                    <div className="space-y-4">
                      <Label htmlFor="guardianName" className="text-base font-medium text-gray-700">Guardian Name</Label>
                      <div className="relative group">
                        <UserCircle className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-red-500 transition-colors" />
                        <Input
                          id="guardianName"
                          type="text"
                          placeholder="Enter guardian/parent name"
                          value={guardianName}
                          onChange={(e) => setGuardianName(e.target.value)}
                          className="pl-12 h-14 text-base border-gray-200 rounded-xl focus:border-red-500"
                          required={!isLogin}
                        />
                      </div>
                    </div>
                    <div className="space-y-4">
                      <Label htmlFor="guardianPhone" className="text-base font-medium text-gray-700">Guardian Phone Number</Label>
                      <div className="relative group">
                        <Phone className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-red-500 transition-colors" />
                        <Input
                          id="guardianPhone"
                          type="tel"
                          placeholder="Enter guardian phone number"
                          value={guardianPhone}
                          onChange={(e) => setGuardianPhone(e.target.value)}
                          className="pl-12 h-14 text-base border-gray-200 rounded-xl focus:border-red-500"
                          required={!isLogin}
                        />
                      </div>
                    </div>
                    </>
                  )}

                  {/* POLICE SPECIFIC FIELDS */}
                  {role === 'police' && (
                    <>
                    <div className="space-y-4">
                      <Label htmlFor="badgeNumber" className="text-base font-medium text-gray-700">Badge Number</Label>
                      <div className="relative group">
                        <Shield className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                        <Input
                          id="badgeNumber"
                          type="text"
                          placeholder="Enter your badge number"
                          value={badgeNumber}
                          onChange={(e) => setBadgeNumber(e.target.value)}
                          className="pl-12 h-14 text-base border-gray-200 rounded-xl focus:border-blue-500"
                          required={!isLogin}
                        />
                      </div>
                    </div>
                    <div className="space-y-4">
                      <Label htmlFor="area" className="text-base font-medium text-gray-700">Area / Jurisdiction</Label>
                      <div className="relative group">
                        <MapPin className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                        <Input
                          id="area"
                          type="text"
                          placeholder="Enter your area or jurisdiction"
                          value={area}
                          onChange={(e) => setArea(e.target.value)}
                          className="pl-12 h-14 text-base border-gray-200 rounded-xl focus:border-blue-500"
                          required={!isLogin}
                        />
                      </div>
                    </div>
                    <div className="space-y-4">
                      <Label htmlFor="policeStation" className="text-base font-medium text-gray-700">Police Station Name</Label>
                      <div className="relative group">
                        <Building2 className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                        <Input
                          id="policeStation"
                          type="text"
                          placeholder="Enter your police station name"
                          value={policeStation}
                          onChange={(e) => setPoliceStation(e.target.value)}
                          className="pl-12 h-14 text-base border-gray-200 rounded-xl focus:border-blue-500"
                          required={!isLogin}
                        />
                      </div>
                    </div>
                    </>
                  )}
                  </>
                )}
                </>
              )}

              {error && (
                <div className="flex items-start gap-4 p-6 bg-red-50 border border-red-200 rounded-xl animate-mobile">
                  <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
                  <span className="text-base text-red-700 leading-relaxed">{error}</span>
                </div>
              )}

              <Button 
                type="submit" 
                className="w-full h-14 bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-white font-semibold rounded-xl shadow-xl hover:shadow-2xl transform hover:scale-[1.02] transition-all duration-200 text-lg" 
                disabled={loading}
              >
                {loading ? (
                  <div className="flex items-center justify-center gap-3">
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Please wait...
                  </div>
                ) : (
                  isLogin ? "Sign In" : "Sign Up"
                )}
              </Button>
            </form>

            <div className="text-center pt-6 border-t border-gray-100">
              <button
                type="button"
                onClick={() => {
                  setIsLogin(!isLogin);
                  setError("");
                }}
                className="text-base text-red-600 hover:text-red-700 font-semibold hover:underline transition-colors"
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
    </div>
  );
}
