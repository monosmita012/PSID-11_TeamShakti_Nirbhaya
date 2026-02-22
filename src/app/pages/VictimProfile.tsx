import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { User, Phone, MapPin, Edit2, Save, X, ArrowLeft, Plus, Trash2, ChevronDown } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { getAuth, updateProfile } from "firebase/auth";
import { ref, set, get, update, onValue, remove } from "firebase/database";
import { database } from "../firebase-config";

interface ProfileData {
  name: string;
  phone: string;
  email: string;
  age: string;
  guardianName: string;
  guardianPhone: string;
  address: string;
  role?: string;
}

interface AdditionalGuardian {
  id: string;
  name: string;
  phone: string;
}

export default function VictimProfile() {
  const navigate = useNavigate();
  const auth = getAuth();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<ProfileData>({
    name: "",
    phone: "",
    email: "",
    age: "",
    guardianName: "",
    guardianPhone: "",
    address: ""
  });
  const [loading, setLoading] = useState(true);
  const [additionalGuardians, setAdditionalGuardians] = useState<AdditionalGuardian[]>([]);
  const [isAddingGuardian, setIsAddingGuardian] = useState(false);
  const [newGuardian, setNewGuardian] = useState({ name: "", phone: "" });

  useEffect(() => {
    fetchProfile();
    fetchAdditionalGuardians();
  }, []);

  const fetchProfile = async () => {
    if (!auth.currentUser) return;
    setLoading(true);
    try {
      const profileRef = ref(database, `users/${auth.currentUser.uid}`);
      const snapshot = await get(profileRef);
      const data = snapshot.val();
      
      if (data) {
        setProfile(data);
        setFormData({
          name: data.name || "",
          phone: data.phone || "",
          email: data.email || auth.currentUser.email || "",
          age: data.age || "",
          guardianName: data.guardianName || "",
          guardianPhone: data.guardianPhone || "",
          address: data.address || ""
        });
      } else {
        const fallback = {
          name: auth.currentUser?.displayName || "",
          phone: "",
          email: auth.currentUser?.email || "",
          age: "",
          guardianName: "",
          guardianPhone: "",
          address: ""
        };
        setProfile(fallback);
        setFormData(fallback);
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAdditionalGuardians = async () => {
    if (!auth.currentUser) return;
    try {
      const guardiansRef = ref(database, `users/${auth.currentUser.uid}/additionalGuardians`);
      const snapshot = await get(guardiansRef);
      const data = snapshot.val();
      if (data) {
        const guardiansList = Object.entries(data).map(([id, guardian]: [string, any]) => ({
          id,
          name: guardian.name,
          phone: guardian.phone
        }));
        setAdditionalGuardians(guardiansList);
      } else {
        setAdditionalGuardians([]);
      }
    } catch (error) {
      console.error("Error fetching additional guardians:", error);
    }
  };

  const handleSave = async () => {
    if (!auth.currentUser) return;
    try {
      const profileRef = ref(database, `users/${auth.currentUser.uid}`);
      const existing = profile ? (await get(profileRef)).val() : {};
      const toSave = {
        ...existing,
        ...formData,
        role: existing?.role ?? "victim",
        email: formData.email || auth.currentUser.email
      };
      await set(profileRef, toSave);
      await updateProfile(auth.currentUser, { displayName: formData.name });
      setProfile(formData);
      setIsEditing(false);
    } catch (error) {
      console.error("Error saving profile:", error);
    }
  };

  const handleCancel = () => {
    if (profile) {
      setFormData(profile);
    }
    setIsEditing(false);
  };

  const handleAddGuardian = async () => {
    if (!auth.currentUser || !newGuardian.name || !newGuardian.phone) return;
    try {
      const guardianId = `guardian_${Date.now()}`;
      await set(
        ref(database, `users/${auth.currentUser.uid}/additionalGuardians/${guardianId}`),
        newGuardian
      );
      setNewGuardian({ name: "", phone: "" });
      setIsAddingGuardian(false);
      fetchAdditionalGuardians();
    } catch (error) {
      console.error("Error adding guardian:", error);
    }
  };

  const handleDeleteGuardian = async (id: string) => {
    if (!auth.currentUser) return;
    try {
      await remove(ref(database, `users/${auth.currentUser.uid}/additionalGuardians/${id}`));
      fetchAdditionalGuardians();
    } catch (error) {
      console.error("Error deleting guardian:", error);
    }
  };

  const callPhone = (phone: string) => {
    window.open(`tel:${phone}`, '_self');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-pink-50 to-purple-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-pink-50 to-purple-50 p-4 safe-area-top safe-area-bottom">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={() => navigate('/victim-dashboard')}
            className="mb-4 flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Button>
          <h1 className="text-3xl font-bold text-gray-900">My Profile</h1>
          <p className="text-gray-600 mt-2">Manage your personal information and emergency contacts</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Personal Information */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <User className="w-5 h-5" />
                    Personal Information
                  </CardTitle>
                  <CardDescription>Your basic details and contact information</CardDescription>
                </div>
                {!isEditing ? (
                  <Button onClick={() => setIsEditing(true)} variant="outline" size="sm">
                    <Edit2 className="w-4 h-4 mr-2" />
                    Edit
                  </Button>
                ) : (
                  <div className="flex gap-2">
                    <Button onClick={handleSave} size="sm">
                      <Save className="w-4 h-4 mr-2" />
                      Save
                    </Button>
                    <Button onClick={handleCancel} variant="outline" size="sm">
                      <X className="w-4 h-4 mr-2" />
                      Cancel
                    </Button>
                  </div>
                )}
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">Full Name</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      disabled={!isEditing}
                    />
                  </div>
                  <div>
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      disabled={!isEditing}
                    />
                  </div>
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      disabled={!isEditing}
                      type="email"
                    />
                  </div>
                  <div>
                    <Label htmlFor="age">Age</Label>
                    <Input
                      id="age"
                      value={formData.age}
                      onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                      disabled={!isEditing}
                      type="number"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="address">Address</Label>
                  <Input
                    id="address"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    disabled={!isEditing}
                    placeholder="Your home address"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Primary Guardian */}
            <Card>
              <CardHeader>
                <CardTitle>Primary Guardian</CardTitle>
                <CardDescription>Your main emergency contact</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="guardianName">Guardian Name</Label>
                    <Input
                      id="guardianName"
                      value={formData.guardianName}
                      onChange={(e) => setFormData({ ...formData, guardianName: e.target.value })}
                      disabled={!isEditing}
                    />
                  </div>
                  <div>
                    <Label htmlFor="guardianPhone">Guardian Phone</Label>
                    <Input
                      id="guardianPhone"
                      value={formData.guardianPhone}
                      onChange={(e) => setFormData({ ...formData, guardianPhone: e.target.value })}
                      disabled={!isEditing}
                    />
                  </div>
                </div>
                {formData.guardianPhone && !isEditing && (
                  <Button
                    onClick={() => callPhone(formData.guardianPhone)}
                    variant="outline"
                    className="w-full"
                  >
                    <Phone className="w-4 h-4 mr-2" />
                    Call Guardian
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Additional Guardians */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  Additional Guardians
                  <Button
                    onClick={() => setIsAddingGuardian(true)}
                    size="sm"
                    variant="outline"
                    disabled={isEditing}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add
                  </Button>
                </CardTitle>
                <CardDescription>Other emergency contacts</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {isAddingGuardian && (
                  <div className="space-y-3 p-3 border rounded-lg bg-gray-50">
                    <Input
                      placeholder="Guardian Name"
                      value={newGuardian.name}
                      onChange={(e) => setNewGuardian({ ...newGuardian, name: e.target.value })}
                    />
                    <Input
                      placeholder="Phone Number"
                      value={newGuardian.phone}
                      onChange={(e) => setNewGuardian({ ...newGuardian, phone: e.target.value })}
                    />
                    <div className="flex gap-2">
                      <Button onClick={handleAddGuardian} size="sm">
                        Add Guardian
                      </Button>
                      <Button onClick={() => setIsAddingGuardian(false)} variant="outline" size="sm">
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}

                {/* Additional Guardians List */}
                <div className="space-y-2">
                  {additionalGuardians.length === 0 ? (
                    <div className="text-center py-4 text-gray-500 bg-gray-50 rounded-lg">
                      <User className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No additional guardians</p>
                    </div>
                  ) : (
                    additionalGuardians.map((guardian) => (
                      <div
                        key={guardian.id}
                        className="flex items-center justify-between p-3 border rounded-lg bg-gray-50"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-blue-500" />
                            <span className="font-medium">{guardian.name}</span>
                          </div>
                          <div className="text-sm text-gray-600 flex items-center gap-1">
                            <Phone className="w-3 h-3" />
                            {guardian.phone}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            onClick={() => callPhone(guardian.phone)}
                            size="sm"
                            variant="outline"
                          >
                            <Phone className="w-4 h-4" />
                          </Button>
                          <Button
                            onClick={() => handleDeleteGuardian(guardian.id)}
                            size="sm"
                            variant="outline"
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
