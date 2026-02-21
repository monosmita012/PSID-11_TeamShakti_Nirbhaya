import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { Shield, Mail, Lock, MapPin, Building, Phone } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Button } from "../components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile, getAuth } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { db } from "../../firebase";

const mapAuthError = (code: string) => {
  switch (code) {
    case "auth/email-already-in-use":
      return "Email already registered. Signing you in...";
    case "auth/invalid-email":
      return "Please enter a valid email address.";
    case "auth/operation-not-allowed":
      return "Email/password sign-in is not enabled in Firebase.";
    case "auth/weak-password":
      return "Password must be at least 6 characters.";
    default:
      return "Unable to register. Please try again.";
  }
};

export default function Register() {
  const navigate = useNavigate();

  // Station form state
  const [stationName, setStationName] = useState("");
  const [stationArea, setStationArea] = useState("");
  const [stationLocation, setStationLocation] = useState("");
  const [areaType, setAreaType] = useState("");
  const [stationEmail, setStationEmail] = useState("");
  const [stationPassword, setStationPassword] = useState("");
  const [stationMobile, setStationMobile] = useState("");

  const [error, setError] = useState("");

  const handleStationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!stationName || !stationArea || !stationLocation || !areaType || !stationEmail || !stationPassword || !stationMobile) {
      setError("Please fill in all required fields");
      return;
    }

    const email = stationEmail.trim();
    const password = stationPassword.trim();

    try {
      const auth = getAuth();
      let userId: string;

      // Step 1: Create Firebase Auth account (or sign in if already exists)
      try {
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        userId = cred.user.uid;
        await updateProfile(cred.user, { displayName: "station" });
        await cred.user.reload();
      } catch (authErr: any) {
        if (authErr?.code === "auth/email-already-in-use") {
          const cred = await signInWithEmailAndPassword(auth, email, password);
          userId = cred.user.uid;
        } else {
          throw authErr;
        }
      }

      // Step 2: Write profile to Firestore
      try {
        await setDoc(doc(db, "station_profiles", userId), {
          id: userId,
          stationName,
          stationArea,
          stationLocation,
          areaType,
          email,
          mobile: stationMobile,
          type: "station",
          createdAt: new Date().toISOString(),
        });
      } catch {
        // Firestore write failed (rules may block it)
      }

      navigate("/police", { replace: true });
    } catch (err: any) {
      setError(mapAuthError(err?.code));
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-16 h-16 bg-indigo-600 rounded-full flex items-center justify-center">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <CardTitle className="text-2xl">Police Station Registration</CardTitle>
          <CardDescription>Register your Police Station for PCR dashboard access</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Station Registration Form */}
          <div>
            <form onSubmit={handleStationSubmit} className="space-y-4">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm">
                  {error}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="stationName">Police Station Name *</Label>
                <div className="relative">
                  <Building className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                  <Input
                    id="stationName"
                    placeholder="Central Police Station"
                    className="pl-10"
                    value={stationName}
                    onChange={(e) => setStationName(e.target.value)}
                  />
                </div>
              </div>

                <div className="space-y-2">
                  <Label htmlFor="stationEmail">Station Email *</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                    <Input
                      id="stationEmail"
                      type="email"
                      placeholder="station@police.gov"
                      className="pl-10"
                      value={stationEmail}
                      onChange={(e) => setStationEmail(e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="stationMobile">Mobile Number *</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                    <Input
                      id="stationMobile"
                      type="tel"
                      placeholder="Enter mobile number"
                      className="pl-10"
                      value={stationMobile}
                      onChange={(e) => setStationMobile(e.target.value)}
                    />
                  </div>
                </div>

              <div className="space-y-2">
                <Label htmlFor="stationPassword">Password *</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                  <Input
                    id="stationPassword"
                    type="password"
                    placeholder="••••••••"
                    className="pl-10"
                    value={stationPassword}
                    onChange={(e) => setStationPassword(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="stationArea">Area *</Label>
                  <Input
                    id="stationArea"
                    placeholder="Downtown District"
                    value={stationArea}
                    onChange={(e) => setStationArea(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="areaType">Area Type *</Label>
                  <Select value={areaType} onValueChange={setAreaType}>
                    <SelectTrigger id="areaType">
                      <SelectValue placeholder="Select area type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="urban">Urban</SelectItem>
                      <SelectItem value="suburban">Suburban</SelectItem>
                      <SelectItem value="rural">Rural</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="stationLocation">Station Location *</Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                  <Input
                    id="stationLocation"
                    placeholder="123 Police Ave, City, State"
                    className="pl-10"
                    value={stationLocation}
                    onChange={(e) => setStationLocation(e.target.value)}
                  />
                </div>
              </div>

              <Button type="submit" className="w-full">
                Register Police Station
              </Button>
            </form>
          </div>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Already have an account?{" "}
              <Link to="/login" className="text-indigo-600 hover:underline font-medium">
                Sign in here
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
