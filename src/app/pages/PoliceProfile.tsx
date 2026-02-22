import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { Shield, Phone, MapPin, Edit2, Save, X, ArrowLeft, Building, Mail, User } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { getAuth, updateProfile } from "firebase/auth";
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import { db } from "../../firebase";

interface PoliceProfileData {
  id: string;
  stationName: string;
  stationArea: string;
  stationLocation: string;
  areaType: string;
  email: string;
  mobile: string;
  type: string;
  createdAt: string;
}

export default function PoliceProfile() {
  const navigate = useNavigate();
  const auth = getAuth();
  const [profile, setProfile] = useState<PoliceProfileData | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<PoliceProfileData>({
    id: "",
    stationName: "",
    stationArea: "",
    stationLocation: "",
    areaType: "",
    email: "",
    mobile: "",
    type: "station",
    createdAt: ""
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    if (!auth.currentUser) return;
    setLoading(true);
    try {
      const profileRef = doc(db, "station_profiles", auth.currentUser.uid);
      const snapshot = await getDoc(profileRef);
      const data = snapshot.data();
      
      if (data) {
        // Direct mapping from registration data
        const merged = {
          id: data.id ?? auth.currentUser.uid,
          stationName: data.stationName ?? "",
          stationArea: data.stationArea ?? "",
          stationLocation: data.stationLocation ?? "",
          areaType: data.areaType ?? "",
          email: data.email ?? auth.currentUser.email ?? "",
          mobile: data.mobile ?? "",  // This matches the registration field
          type: data.type ?? "station",
          createdAt: data.createdAt ?? new Date().toISOString()
        };
        setProfile(merged);
        setFormData(merged);
      } else {
        // Try to get data from Firebase Auth as fallback
        const fallback = {
          id: auth.currentUser.uid,
          stationName: "",
          stationArea: "",
          stationLocation: "",
          areaType: "",
          email: auth.currentUser.email ?? "",
          mobile: "",
          type: "station",
          createdAt: new Date().toISOString()
        };
        setProfile(fallback);
        setFormData(fallback);
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
      // Always provide fallback data instead of showing error
      const fallback = {
        id: auth.currentUser?.uid ?? "",
        stationName: "",
        stationArea: "",
        stationLocation: "",
        areaType: "",
        email: auth.currentUser?.email ?? "",
        mobile: "",
        type: "station",
        createdAt: new Date().toISOString()
      };
      setProfile(fallback);
      setFormData(fallback);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!auth.currentUser) return;
    try {
      const profileRef = doc(db, "station_profiles", auth.currentUser.uid);
      const toSave = {
        ...formData,
        updatedAt: new Date().toISOString()
      };
      await updateDoc(profileRef, toSave);
      setProfile(formData);
      setIsEditing(false);
      setSuccess("Profile updated successfully!");
      setTimeout(() => setSuccess(null), 3000);
    } catch (error) {
      console.error("Error saving profile:", error);
      setError("Failed to update profile. Please try again.");
    }
  };

  const handleCancel = () => {
    if (profile) {
      setFormData(profile);
    }
    setIsEditing(false);
    setError(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-blue-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" onClick={() => navigate(-1)} className="border-blue-300 text-blue-600 hover:bg-blue-50">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Police Station Profile</h1>
              <p className="text-gray-600">Manage your police station information and contact details</p>
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm">
            ⚠ {error}
          </div>
        )}

        {success && (
          <div className="mb-6 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded text-sm">
            ✓ {success}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-1 gap-6">
          {/* Station Information */}
          <div>
            <Card>
              <CardHeader className="flex justify-between items-center">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Building className="w-5 h-5" />
                    Station Information
                  </CardTitle>
                  <CardDescription>
                    {isEditing ? "Edit your station details" : "Your current station information"}
                  </CardDescription>
                </div>
                {!isEditing ? (
                  <Button onClick={() => setIsEditing(true)} variant="outline" className="flex items-center gap-2 bg-white border-blue-300 text-blue-600 hover:bg-blue-50">
                    <Edit2 className="w-4 h-4" />
                    Edit
                  </Button>
                ) : (
                  <Button onClick={handleSave} className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600">
                    <Save className="w-4 h-4" />
                    Save
                  </Button>
                )}
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="stationName">Station Name</Label>
                    <Input
                      id="stationName"
                      value={formData.stationName}
                      onChange={(e) => setFormData({ ...formData, stationName: e.target.value })}
                      disabled={!isEditing}
                      placeholder="Enter station name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="stationArea">Area</Label>
                    <Input
                      id="stationArea"
                      value={formData.stationArea}
                      onChange={(e) => setFormData({ ...formData, stationArea: e.target.value })}
                      disabled={!isEditing}
                      placeholder="Enter station area"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="areaType">Area Type</Label>
                    <Input
                      id="areaType"
                      value={formData.areaType}
                      onChange={(e) => setFormData({ ...formData, areaType: e.target.value })}
                      disabled={!isEditing}
                      placeholder="Urban/Suburban/Rural"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="stationLocation">Station Location</Label>
                    <Input
                      id="stationLocation"
                      value={formData.stationLocation}
                      onChange={(e) => setFormData({ ...formData, stationLocation: e.target.value })}
                      disabled={!isEditing}
                      placeholder="Enter station address"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      disabled={!isEditing}
                      placeholder="Station email address"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="mobile">Mobile Number</Label>
                    <Input
                      id="mobile"
                      type="tel"
                      value={formData.mobile}
                      onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                      disabled={!isEditing}
                      placeholder="Station mobile number"
                    />
                  </div>
                </div>

                {/* Registration Information */}
                <div className="border-t pt-4 mt-6">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Shield className="w-5 h-5 text-blue-600" />
                    Registration Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Station ID</Label>
                      <Input
                        value={formData.id}
                        disabled
                        className="bg-gray-50"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Registration Date</Label>
                      <Input
                        value={formData.createdAt ? new Date(formData.createdAt).toLocaleDateString() : "N/A"}
                        disabled
                        className="bg-gray-50"
                      />
                    </div>
                  </div>
                </div>

                {isEditing && (
                  <div className="flex gap-2 pt-4 border-t">
                    <Button onClick={handleSave} className="flex items-center gap-2">
                      <Save className="w-4 h-4" />
                      Save Changes
                    </Button>
                    <Button onClick={handleCancel} variant="outline" className="flex items-center gap-2">
                      <X className="w-4 h-4" />
                      Cancel
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
