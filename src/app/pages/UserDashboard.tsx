import { useState, useEffect } from "react";
import {
  Bell, Calendar, MapPin,
  Clock, LogOut, Phone, Mail, Edit2, Plus, Trash2, Check,
  FileText, UserCheck
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { getAuth, onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc, onSnapshot, setDoc, collection, addDoc, query, where } from "firebase/firestore";
import { db } from "../../firebase";

export default function UserDashboard() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);
  const [guardians, setGuardians] = useState([
    { id: "1", name: "Jane Smith", phone: "+1 (555) 123-4567", email: "jane@example.com", verified: true },
    { id: "2", name: "Bob Johnson", phone: "+1 (555) 987-6543", email: "bob@example.com", verified: false },
  ]);
  const [newGuardian, setNewGuardian] = useState({ name: "", phone: "", email: "" });
  const [showAddGuardian, setShowAddGuardian] = useState(false);
  const [guardianOtps, setGuardianOtps] = useState<Record<string, string>>({});
  const [guardianOtpInputs, setGuardianOtpInputs] = useState<Record<string, string>>({});
  const [guardianOtpStatus, setGuardianOtpStatus] = useState<Record<string, string>>({});
  const [reports, setReports] = useState<any[]>([]);

  // Profile edit state
  const [editedName, setEditedName] = useState("");
  const [editedAge, setEditedAge] = useState("");
  const [editedPhone, setEditedPhone] = useState("");
  const [editedAddress, setEditedAddress] = useState("");

  useEffect(() => {
    const auth = getAuth();
    let unsubReports: (() => void) | null = null;

    const unsubAuth = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        if (unsubReports) unsubReports();
        window.location.href = "/login";
        return;
      }

      const profileRef = doc(db, "profiles", user.uid);
      const profileSnap = await getDoc(profileRef);
      const profile = profileSnap.exists() ? profileSnap.data() : {};
      setCurrentUser({ id: user.uid, email: user.email, ...profile });
      setEditedName(profile.name || "");
      setEditedAge(profile.age || "");
      setEditedPhone(profile.phone || "");
      setEditedAddress(profile.address || "");

      const reportsRef = collection(db, "reports");
      const q = query(reportsRef, where("userId", "==", user.uid));
      if (unsubReports) unsubReports();
      unsubReports = onSnapshot(q, (snapshot) => {
        const items = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
        setReports(items);
      });
    });

    return () => {
      unsubAuth();
      if (unsubReports) unsubReports();
    };
  }, []);

  const handleLogout = async () => {
    const auth = getAuth();
    await signOut(auth);
    window.location.href = "/login";
  };

  const handleSaveProfile = async () => {
    if (!currentUser?.id) return;
    const profileRef = doc(db, "profiles", currentUser.id);
    const updatedUser = {
      ...currentUser,
      name: editedName,
      age: editedAge,
      phone: editedPhone,
      address: editedAddress,
    };
    await setDoc(profileRef, updatedUser, { merge: true });
    setCurrentUser(updatedUser);
    setIsEditingProfile(false);
    setProfileSaved(true);
    setTimeout(() => setProfileSaved(false), 3000);
  };

  const generateOtp = () => Math.floor(100000 + Math.random() * 900000).toString();

  const handleAddGuardian = () => {
    if (newGuardian.name && newGuardian.phone && newGuardian.email) {
      const id = Date.now().toString();
      const otp = generateOtp();
      setGuardians([...guardians, { ...newGuardian, id, verified: false }]);
      setGuardianOtps(prev => ({ ...prev, [id]: otp }));
      setGuardianOtpStatus(prev => ({ ...prev, [id]: `OTP sent to ${newGuardian.email}` }));
      alert(`OTP ${otp} sent to ${newGuardian.email}`);
      setNewGuardian({ name: "", phone: "", email: "" });
      setShowAddGuardian(false);
    }
  };

  const handleRemoveGuardian = (id: string) => {
    setGuardians(guardians.filter(g => g.id !== id));
  };

  const handleVerifyGuardian = (id: string, email: string) => {
    const existingOtp = guardianOtps[id];
    if (!existingOtp) {
      const otp = generateOtp();
      setGuardianOtps(prev => ({ ...prev, [id]: otp }));
      setGuardianOtpStatus(prev => ({ ...prev, [id]: `OTP sent to ${email}` }));
      alert(`OTP ${otp} sent to ${email}`);
      return;
    }

    const input = guardianOtpInputs[id];
    if (input && input === existingOtp) {
      setGuardians(guardians.map(g => g.id === id ? { ...g, verified: true } : g));
      setGuardianOtpStatus(prev => ({ ...prev, [id]: "Guardian verified" }));
      setGuardianOtps(prev => ({ ...prev, [id]: "" }));
      setGuardianOtpInputs(prev => ({ ...prev, [id]: "" }));
    } else {
      setGuardianOtpStatus(prev => ({ ...prev, [id]: "Invalid OTP, try again" }));
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 safe-area-top safe-area-bottom">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-gradient-to-r from-green-600 to-emerald-600 text-white shadow-lg safe-area-top">
        <div className="desktop-container py-6">
          <div className="desktop-flex justify-between items-center gap-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                <UserCheck className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-2xl lg:text-3xl xl:text-4xl font-bold">User Dashboard</h1>
                <p className="text-green-100 text-base lg:text-lg">Community Safety Portal</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" className="text-white hover:bg-white/20 relative w-12 h-12">
                <Bell className="w-6 h-6" />
                <span className="absolute top-1 right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse"></span>
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleLogout}
                className="text-white hover:bg-white/20 w-12 h-12"
              >
                <LogOut className="w-6 h-6" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="desktop-container py-8 space-y-8">
        <Tabs defaultValue="myreports" className="space-y-8">
          <TabsList className="w-full h-auto p-2 bg-white/80 backdrop-blur-sm shadow-xl rounded-2xl">
            <div className="grid grid-cols-3 w-full max-w-2xl mx-auto">
              <TabsTrigger 
                value="myreports" 
                className="flex flex-col lg:flex-row items-center justify-center gap-3 py-4 px-6 text-sm lg:text-base font-semibold rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-green-500 data-[state=active]:to-emerald-500 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all"
              >
                <FileText className="w-5 h-5" />
                <span>History</span>
              </TabsTrigger>
              <TabsTrigger 
                value="profile" 
                className="flex flex-col lg:flex-row items-center justify-center gap-3 py-4 px-6 text-sm lg:text-base font-semibold rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-green-500 data-[state=active]:to-emerald-500 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all"
              >
                <UserCheck className="w-5 h-5" />
                <span>Profile</span>
              </TabsTrigger>
              <TabsTrigger 
                value="guardians" 
                className="flex flex-col lg:flex-row items-center justify-center gap-3 py-4 px-6 text-sm lg:text-base font-semibold rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-green-500 data-[state=active]:to-emerald-500 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all"
              >
                <Bell className="w-5 h-5" />
                <span>Guardians</span>
              </TabsTrigger>
            </div>
          </TabsList>

          {/* My Reports Tab */}
          <TabsContent value="myreports">
            <Card className="shadow-lg border-0 bg-white/90 backdrop-blur-sm">
              <CardHeader className="pb-6">
                <CardTitle className="text-xl lg:text-2xl">My Reports</CardTitle>
                <CardDescription className="text-base">Track the status of your submitted reports</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {reports.map((report) => (
                    <div key={report.id} className="border border-gray-200 rounded-2xl p-6 hover:bg-gray-50 hover:shadow-xl transition-all animate-mobile">
                      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 mb-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <p className="font-mono text-sm text-gray-600 bg-gray-100 px-3 py-1 rounded-lg">{report.id}</p>
                          </div>
                          <p className="font-bold text-xl lg:text-2xl">{report.type}</p>
                        </div>
                        <p className="text-base font-semibold px-4 py-2 bg-blue-100 text-blue-700 rounded-full whitespace-nowrap">
                          Status: {report.status}
                        </p>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                        <div className="flex items-center gap-3 text-gray-600 bg-gray-50 p-3 rounded-lg">
                          <Calendar className="w-5 h-5 text-blue-500 flex-shrink-0" />
                          <div>
                            <p className="text-xs text-gray-500">Date</p>
                            <p className="font-medium">{report.date}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 text-gray-600 bg-gray-50 p-3 rounded-lg">
                          <MapPin className="w-5 h-5 text-red-500 flex-shrink-0" />
                          <div>
                            <p className="text-xs text-gray-500">Location</p>
                            <p className="font-medium text-xs">{report.location}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 text-gray-600 bg-gray-50 p-3 rounded-lg">
                          <Clock className="w-5 h-5 text-green-500 flex-shrink-0" />
                          <div>
                            <p className="text-xs text-gray-500">Response</p>
                            <p className="font-medium">{report.responseTime}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 text-gray-600 bg-gray-50 p-3 rounded-lg">
                          <FileText className="w-5 h-5 text-purple-500 flex-shrink-0" />
                          <div>
                            <p className="text-xs text-gray-500">Evidence</p>
                            <p className="font-medium">{report.evidenceUploaded ? "✓ Uploaded" : "None"}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Profile Tab */}
          <TabsContent value="profile">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Profile</CardTitle>
                    <CardDescription>Your personal details at a glance</CardDescription>
                  </div>
                  {profileSaved && (
                    <div className="text-sm text-green-700 bg-green-50 border border-green-200 px-3 py-1.5 rounded">
                      ✓ Profile saved successfully
                    </div>
                  )}
                  {!isEditingProfile && (
                    <Button variant="outline" onClick={() => setIsEditingProfile(true)}>
                      <Edit2 className="w-4 h-4 mr-2" />
                      Edit Profile
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {!isEditingProfile ? (
                  <div className="space-y-6">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                      <div>
                        <p className="text-sm text-gray-500">Signed in as</p>
                        <p className="text-2xl font-semibold">{currentUser?.name || "Guest"}</p>
                        <p className="text-sm text-gray-600">{currentUser?.email || "No email"}</p>
                      </div>
                      <Badge variant="outline" className="px-3 py-1 text-gray-700">
                        {currentUser?.type === "police" ? "Police" : "User"}
                      </Badge>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="rounded-lg border bg-white p-4 shadow-sm">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Personal</p>
                        <div className="mt-3 space-y-2 text-sm text-gray-700">
                          <div className="flex items-center justify-between">
                            <span className="text-gray-600">Full Name</span>
                            <span className="font-medium">{currentUser?.name || "N/A"}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-gray-600">Age</span>
                            <span className="font-medium">{currentUser?.age || "N/A"}</span>
                          </div>
                        </div>
                      </div>

                      <div className="rounded-lg border bg-white p-4 shadow-sm">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Contact</p>
                        <div className="mt-3 space-y-2 text-sm text-gray-700">
                          <div className="flex items-center justify-between">
                            <span className="text-gray-600">Phone</span>
                            <span className="font-medium">{currentUser?.phone || "N/A"}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-gray-600">Address</span>
                            <span className="font-medium text-right">{currentUser?.address || "N/A"}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="edit-name">Full Name</Label>
                        <Input
                          id="edit-name"
                          value={editedName}
                          onChange={(e) => setEditedName(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="edit-age">Age</Label>
                        <Input
                          id="edit-age"
                          type="number"
                          value={editedAge}
                          onChange={(e) => setEditedAge(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="edit-phone">Phone</Label>
                        <Input
                          id="edit-phone"
                          value={editedPhone}
                          onChange={(e) => setEditedPhone(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Email (Read-only)</Label>
                        <Input value={currentUser?.email || ""} disabled />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-address">Address</Label>
                      <Input
                        id="edit-address"
                        value={editedAddress}
                        onChange={(e) => setEditedAddress(e.target.value)}
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={handleSaveProfile}>
                        <Check className="w-4 h-4 mr-2" />
                        Save Changes
                      </Button>
                      <Button variant="outline" onClick={() => setIsEditingProfile(false)}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Guardians Tab */}
          <TabsContent value="guardians">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>👨‍👩‍👧 Guardian Management</CardTitle>
                    <CardDescription>Add trusted contacts who will be notified during emergencies</CardDescription>
                  </div>
                  <Button onClick={() => setShowAddGuardian(!showAddGuardian)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Guardian
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {showAddGuardian && (
                  <div className="mb-6 p-4 border rounded-lg bg-gray-50">
                    <h4 className="font-medium mb-4">Add New Guardian</h4>
                    <div className="grid md:grid-cols-3 gap-4 mb-4">
                      <Input
                        placeholder="Full Name"
                        value={newGuardian.name}
                        onChange={(e) => setNewGuardian({ ...newGuardian, name: e.target.value })}
                      />
                      <Input
                        placeholder="Phone Number"
                        value={newGuardian.phone}
                        onChange={(e) => setNewGuardian({ ...newGuardian, phone: e.target.value })}
                      />
                      <Input
                        placeholder="Email Address"
                        value={newGuardian.email}
                        onChange={(e) => setNewGuardian({ ...newGuardian, email: e.target.value })}
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={handleAddGuardian}>Add Guardian</Button>
                      <Button variant="outline" onClick={() => setShowAddGuardian(false)}>Cancel</Button>
                    </div>
                  </div>
                )}

                <div className="space-y-4">
                  {guardians.map((guardian) => (
                    <div key={guardian.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <p className="font-medium">{guardian.name}</p>
                          {guardian.verified && (
                            <Badge className="bg-green-100 text-green-800">
                              <Check className="w-3 h-3 mr-1" />
                              Verified
                            </Badge>
                          )}
                        </div>
                        <div className="space-y-1 text-sm text-gray-600">
                          <div className="flex items-center gap-2">
                            <Phone className="w-3 h-3" />
                            {guardian.phone}
                          </div>
                          <div className="flex items-center gap-2">
                            <Mail className="w-3 h-3" />
                            {guardian.email}
                          </div>
                        </div>
                        {!guardian.verified && guardianOtpStatus[guardian.id] && (
                          <p className="text-xs text-gray-500 mt-2">{guardianOtpStatus[guardian.id]}</p>
                        )}
                      </div>
                      <div className="flex flex-col gap-2 items-end w-56">
                        {!guardian.verified && (
                          <>
                            <Input
                              placeholder="Enter OTP"
                              value={guardianOtpInputs[guardian.id] || ""}
                              onChange={(e) => setGuardianOtpInputs(prev => ({ ...prev, [guardian.id]: e.target.value }))}
                              className="text-sm"
                            />
                            <Button
                              size="sm"
                              variant="outline"
                              className="w-full"
                              onClick={() => handleVerifyGuardian(guardian.id, guardian.email)}
                            >
                              <UserCheck className="w-3 h-3 mr-1" />
                              {guardianOtps[guardian.id] ? "Validate OTP" : "Send OTP"}
                            </Button>
                          </>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-600 hover:bg-red-50 w-full"
                          onClick={() => handleRemoveGuardian(guardian.id)}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

        </Tabs>
      </main>
    </div>
  );
}
