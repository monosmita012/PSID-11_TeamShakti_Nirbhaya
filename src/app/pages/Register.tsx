import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { Shield, Mail, Lock, MapPin, Building } from "lucide-react";
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

  // Police form state
  const [officerName, setOfficerName] = useState("");
  const [officerEmail, setOfficerEmail] = useState("");
  const [officerPassword, setOfficerPassword] = useState("");
  const [badgeNumber, setBadgeNumber] = useState("");
  const [stationName, setStationName] = useState("");
  const [stationArea, setStationArea] = useState("");
  const [stationLocation, setStationLocation] = useState("");
  const [areaType, setAreaType] = useState("");
  const [rank, setRank] = useState("");

  const [error, setError] = useState("");

  const handlePoliceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!officerName || !officerEmail || !officerPassword || !badgeNumber || !stationName || !stationArea || !stationLocation || !areaType || !rank) {
      setError("Please fill in all required fields");
      return;
    }

    const email = officerEmail.trim();
    const password = officerPassword.trim();

    try {
      const auth = getAuth();
      let userId: string;

      // Step 1: Create Firebase Auth account (or sign in if already exists)
      try {
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        userId = cred.user.uid;
        await updateProfile(cred.user, { displayName: "police" });
        await cred.user.reload();
      } catch (authErr: any) {
        if (authErr?.code === "auth/email-already-in-use") {
          const cred = await signInWithEmailAndPassword(auth, email, password);
          userId = cred.user.uid;
        } else {
          throw authErr;
        }
      }

      // Step 2: Write profile to Firestore (non-fatal — user can edit from dashboard if this fails)
      try {
        await setDoc(doc(db, "profiles", userId), {
          id: userId,
          name: officerName,
          email,
          badgeNumber,
          stationName,
          stationArea,
          stationLocation,
          areaType,
          rank,
          type: "police",
          createdAt: new Date().toISOString(),
        });
      } catch {
        // Firestore write failed (rules may block it) — user can still log in and save from profile tab
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
          <CardTitle className="text-2xl">PCR Registration</CardTitle>
          <CardDescription>Register as a Police Control Room officer</CardDescription>
        </CardHeader>
        <CardContent>
            {/* Police Registration Form */}
            <div>
              <form onSubmit={handlePoliceSubmit} className="space-y-4">
                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm">
                    {error}
                  </div>
                )}

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="officerName">Full Name *</Label>
                    <Input
                      id="officerName"
                      placeholder="Officer John Smith"
                      value={officerName}
                      onChange={(e) => setOfficerName(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="badgeNumber">Badge Number *</Label>
                    <Input
                      id="badgeNumber"
                      placeholder="P-1245"
                      value={badgeNumber}
                      onChange={(e) => setBadgeNumber(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="officerEmail">Email *</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                    <Input
                      id="officerEmail"
                      type="email"
                      placeholder="officer@police.gov"
                      className="pl-10"
                      value={officerEmail}
                      onChange={(e) => setOfficerEmail(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="officerPassword">Password *</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                    <Input
                      id="officerPassword"
                      type="password"
                      placeholder="••••••••"
                      className="pl-10"
                      value={officerPassword}
                      onChange={(e) => setOfficerPassword(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="rank">Rank *</Label>
                  <Select value={rank} onValueChange={setRank}>
                    <SelectTrigger id="rank">
                      <SelectValue placeholder="Select rank" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="officer">Police Officer</SelectItem>
                      <SelectItem value="corporal">Corporal</SelectItem>
                      <SelectItem value="sergeant">Sergeant</SelectItem>
                      <SelectItem value="lieutenant">Lieutenant</SelectItem>
                      <SelectItem value="captain">Captain</SelectItem>
                      <SelectItem value="chief">Chief</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

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
                  Register as Police Officer
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
