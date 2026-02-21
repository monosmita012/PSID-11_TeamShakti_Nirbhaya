import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { Shield, User, Mail, Lock, Calendar, MapPin, Building } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Button } from "../components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";

export default function Register() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("user");

  // User form state
  const [userName, setUserName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [userPassword, setUserPassword] = useState("");
  const [userAge, setUserAge] = useState("");
  const [userPhone, setUserPhone] = useState("");
  const [userAddress, setUserAddress] = useState("");

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

  const handleUserSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!userName || !userEmail || !userPassword || !userAge) {
      setError("Please fill in all required fields");
      return;
    }

    const users = JSON.parse(localStorage.getItem("users") || "[]");
    
    // Check if email already exists
    if (users.some((u: any) => u.email === userEmail)) {
      setError("Email already registered");
      return;
    }

    const newUser = {
      id: Date.now().toString(),
      name: userName,
      email: userEmail,
      password: userPassword,
      age: userAge,
      phone: userPhone,
      address: userAddress,
      createdAt: new Date().toISOString(),
    };

    users.push(newUser);
    localStorage.setItem("users", JSON.stringify(users));
    
    // Auto login
    localStorage.setItem("currentUser", JSON.stringify({ ...newUser, type: "user" }));
    localStorage.setItem("isAuthenticated", "true");
    
    navigate("/role-select");
  };

  const handlePoliceSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!officerName || !officerEmail || !officerPassword || !badgeNumber || !stationName || !stationArea || !stationLocation || !areaType || !rank) {
      setError("Please fill in all required fields");
      return;
    }

    const police = JSON.parse(localStorage.getItem("police") || "[]");
    
    // Check if email already exists
    if (police.some((p: any) => p.email === officerEmail)) {
      setError("Email already registered");
      return;
    }

    const newOfficer = {
      id: Date.now().toString(),
      name: officerName,
      email: officerEmail,
      password: officerPassword,
      badgeNumber: badgeNumber,
      stationName: stationName,
      stationArea: stationArea,
      stationLocation: stationLocation,
      areaType: areaType,
      rank: rank,
      createdAt: new Date().toISOString(),
    };

    police.push(newOfficer);
    localStorage.setItem("police", JSON.stringify(police));
    
    // Auto login
    localStorage.setItem("currentUser", JSON.stringify({ ...newOfficer, type: "police" }));
    localStorage.setItem("isAuthenticated", "true");
    
    navigate("/role-select");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-16 h-16 bg-indigo-600 rounded-full flex items-center justify-center">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <CardTitle className="text-2xl">Create Account</CardTitle>
          <CardDescription>Register as a user or police officer</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="user" className="flex items-center gap-2">
                <User className="w-4 h-4" />
                User
              </TabsTrigger>
              <TabsTrigger value="police" className="flex items-center gap-2">
                <Shield className="w-4 h-4" />
                Police Officer
              </TabsTrigger>
            </TabsList>

            {/* User Registration Form */}
            <TabsContent value="user">
              <form onSubmit={handleUserSubmit} className="space-y-4">
                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm">
                    {error}
                  </div>
                )}

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="userName">Full Name *</Label>
                    <Input
                      id="userName"
                      placeholder="John Doe"
                      value={userName}
                      onChange={(e) => setUserName(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="userAge">Age *</Label>
                    <Input
                      id="userAge"
                      type="number"
                      placeholder="25"
                      value={userAge}
                      onChange={(e) => setUserAge(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="userEmail">Email *</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                    <Input
                      id="userEmail"
                      type="email"
                      placeholder="your.email@example.com"
                      className="pl-10"
                      value={userEmail}
                      onChange={(e) => setUserEmail(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="userPassword">Password *</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                    <Input
                      id="userPassword"
                      type="password"
                      placeholder="••••••••"
                      className="pl-10"
                      value={userPassword}
                      onChange={(e) => setUserPassword(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="userPhone">Phone Number</Label>
                  <Input
                    id="userPhone"
                    type="tel"
                    placeholder="+1 (555) 123-4567"
                    value={userPhone}
                    onChange={(e) => setUserPhone(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="userAddress">Address</Label>
                  <Input
                    id="userAddress"
                    placeholder="123 Main St, City, State"
                    value={userAddress}
                    onChange={(e) => setUserAddress(e.target.value)}
                  />
                </div>

                <Button type="submit" className="w-full">
                  Register as User
                </Button>
              </form>
            </TabsContent>

            {/* Police Registration Form */}
            <TabsContent value="police">
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
            </TabsContent>
          </Tabs>

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
