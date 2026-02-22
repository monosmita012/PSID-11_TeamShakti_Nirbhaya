import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { User, Phone, MapPin, Edit2, Save, X, ArrowLeft } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { getAuth, updateProfile } from "firebase/auth";
import { ref, set, get, update } from "firebase/database";
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
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [nearestStations, setNearestStations] = useState<any[]>([]);

  useEffect(() => {
    fetchProfile();
    getCurrentLocation();
  }, []);

  const fetchProfile = async () => {
    if (!auth.currentUser) return;
    setLoading(true);
    try {
      const profileRef = ref(database, `users/${auth.currentUser.uid}`);
      const snapshot = await get(profileRef);
      const data = snapshot.val();
      
      const merged = {
        name: data?.name ?? auth.currentUser.displayName ?? "",
        phone: data?.phone ?? "",
        email: data?.email ?? auth.currentUser.email ?? "",
        age: data?.age ?? "",
        guardianName: data?.guardianName ?? "",
        guardianPhone: data?.guardianPhone ?? "",
        address: data?.address ?? "",
        role: data?.role
      };
      setProfile(merged);
      setFormData(merged);
    } catch (error) {
      console.error("Error fetching profile:", error);
      const fallback = {
        name: auth.currentUser.displayName ?? "",
        phone: "",
        email: auth.currentUser.email ?? "",
        age: "",
        guardianName: "",
        guardianPhone: "",
        address: ""
      };
      setProfile(fallback);
      setFormData(fallback);
    } finally {
      setLoading(false);
    }
  };

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
          findNearestPoliceStations(position.coords.latitude, position.coords.longitude);
        },
        (error) => {
          console.error("Error getting location:", error);
        }
      );
    }
  };

  const findNearestPoliceStations = async (lat: number, lng: number) => {
    // Mock police stations - in production, use Google Places API
    const mockStations = [
      { name: "Central Police Station", address: "123 Main St", phone: "911", distance: 0.5 },
      { name: "North District Police", address: "456 Oak Ave", phone: "911", distance: 1.2 },
      { name: "East Side Police", address: "789 Pine Rd", phone: "911", distance: 2.1 }
    ];
    setNearestStations(mockStations);
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

  const getDirections = (station: any) => {
    const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(station.address)}`;
    window.open(mapsUrl, '_blank');
  };

  const callPolice = (phone: string) => {
    window.open(`tel:${phone}`, '_self');
  };

  const getMapsLink = () => {
    if (!location) return "#";
    return `https://www.google.com/maps?q=${location.lat},${location.lng}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-orange-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" onClick={() => navigate(-1)} className="border-orange-300 text-orange-600 hover:bg-orange-50">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Profile</h1>
              <p className="text-gray-600">Manage your emergency information and contacts</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Profile Information */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader className="flex justify-between items-center">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <User className="w-5 h-5" />
                    Personal Information
                  </CardTitle>
                  <CardDescription>
                    {isEditing ? "Edit your profile details" : "Your current profile information"}
                  </CardDescription>
                </div>
                {!isEditing ? (
                  <Button onClick={() => setIsEditing(true)} variant="outline" className="flex items-center gap-2 bg-white border-orange-300 text-orange-600 hover:bg-orange-50">
                    <Edit2 className="w-4 h-4" />
                    Edit
                  </Button>
                ) : (
                  <Button onClick={handleSave} className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600">
                    <Save className="w-4 h-4" />
                    Save
                  </Button>
                )}
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      disabled={!isEditing}
                      placeholder="Enter your full name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      disabled={!isEditing}
                      placeholder="Your phone number"
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
                      placeholder="Your email address"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="age">Age</Label>
                    <Input
                      id="age"
                      type="number"
                      min="1"
                      max="120"
                      value={formData.age}
                      onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                      disabled={!isEditing}
                      placeholder="Your age"
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="address">Home Address</Label>
                    <Input
                      id="address"
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      disabled={!isEditing}
                      placeholder="Your home address"
                    />
                  </div>
                </div>

                {/* Guardian Information */}
                <div className="border-t pt-4 mt-6">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <User className="w-5 h-5 text-blue-600" />
                    Emergency Contact / Guardian
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="guardianName">Guardian Name</Label>
                      <Input
                        id="guardianName"
                        value={formData.guardianName}
                        onChange={(e) => setFormData({ ...formData, guardianName: e.target.value })}
                        disabled={!isEditing}
                        placeholder="Parent or guardian name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="guardianPhone">Guardian Phone</Label>
                      <Input
                        id="guardianPhone"
                        type="tel"
                        value={formData.guardianPhone}
                        onChange={(e) => setFormData({ ...formData, guardianPhone: e.target.value })}
                        disabled={!isEditing}
                        placeholder="Guardian phone number"
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

          {/* Location & Emergency Services */}
          <div className="space-y-6">
            {/* Current Location */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="w-5 h-5" />
                  Current Location
                </CardTitle>
                <CardDescription>
                  Your current GPS location for emergency services
                </CardDescription>
              </CardHeader>
              <CardContent>
                {location ? (
                  <div className="space-y-3">
                    <div className="p-3 bg-blue-50 rounded-lg">
                      <p className="text-sm font-mono">
                        {location.lat.toFixed(6)}, {location.lng.toFixed(6)}
                      </p>
                    </div>
                    <Button
                      onClick={() => window.open(getMapsLink(), '_blank')}
                      className="w-full"
                      variant="outline"
                    >
                      View on Google Maps
                    </Button>
                  </div>
                ) : (
                  <div className="text-center py-4 text-gray-500">
                    <MapPin className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p>Location not available</p>
                    <Button onClick={getCurrentLocation} variant="outline" className="mt-2">
                      Get Location
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Nearest Police Stations */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Phone className="w-5 h-5" />
                  Nearest Police Stations
                </CardTitle>
                <CardDescription>
                  Quick access to emergency services
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {nearestStations.map((station, index) => (
                    <div key={index} className="p-3 border rounded-lg">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h4 className="font-medium">{station.name}</h4>
                          <p className="text-sm text-gray-600">{station.address}</p>
                          <p className="text-xs text-gray-500">Distance: {station.distance} km</p>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => getDirections(station)}
                            variant="outline"
                          >
                            Directions
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => callPolice(station.phone)}
                          >
                            Call
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
