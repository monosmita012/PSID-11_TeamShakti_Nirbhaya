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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-green-700 text-white shadow-lg">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div>
                <h1 className="text-2xl">User Dashboard</h1>
                <p className="text-green-100 text-sm">Community Safety Portal</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" className="text-white hover:bg-green-600 relative">
                <Bell className="w-5 h-5" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleLogout}
                className="text-white hover:bg-green-600"
              >
                <LogOut className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 space-y-8">
        <Tabs defaultValue="myreports" className="space-y-6">
          <TabsList className="w-full grid grid-cols-3 h-14">
            <TabsTrigger value="myreports" className="flex items-center justify-center gap-2 text-base font-bold h-full">
              <FileText className="w-5 h-5" />
              History
            </TabsTrigger>
            <TabsTrigger value="profile" className="flex items-center justify-center gap-2 text-base font-bold h-full">
              <UserCheck className="w-5 h-5" />
              Profile
            </TabsTrigger>
            <TabsTrigger value="guardians" className="flex items-center justify-center gap-2 text-base font-bold h-full">
              <Bell className="w-5 h-5" />
              Guardians
            </TabsTrigger>
          </TabsList>

          {/* My Reports Tab */}
          <TabsContent value="myreports">
            <Card>
              <CardHeader>
                <CardTitle>My Reports</CardTitle>
                <CardDescription>Track the status of your submitted reports</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {reports.map((report) => (
                    <div key={report.id} className="border rounded-lg p-4 hover:bg-gray-50">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-mono text-sm text-gray-600">{report.id}</p>
                          </div>
                          <p className="font-medium text-lg">{report.type}</p>
                        </div>
                        <p className="text-sm text-gray-700 font-medium">Status: {report.status}</p>
                      </div>

                      <div className="grid md:grid-cols-2 gap-3 text-sm">
                        <div className="flex items-center gap-2 text-gray-600">
                          <Calendar className="w-4 h-4" />
                          <span>Date: {report.date}</span>
                        </div>
                        <div className="flex items-center gap-2 text-gray-600">
                          <MapPin className="w-4 h-4" />
                          <span>Location: {report.location}</span>
                        </div>
                        <div className="flex items-center gap-2 text-gray-600">
                          <Clock className="w-4 h-4" />
                          <span>Response Time: {report.responseTime}</span>
                        </div>
                        <div className="flex items-center gap-2 text-gray-600">
                          <FileText className="w-4 h-4" />
                          <span>Evidence: {report.evidenceUploaded ? "✓ Uploaded" : "None"}</span>
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
