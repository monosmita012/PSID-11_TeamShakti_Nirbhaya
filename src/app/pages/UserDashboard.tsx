import { useState, useEffect } from "react";
import { Link } from "react-router";
import { 
  ArrowLeft, AlertTriangle, Send, Bell, Shield, Calendar, MapPin, 
  Clock, LogOut, User, Phone, Mail, Edit2, Plus, Trash2, Check, 
  Upload, FileText, Navigation, UserCheck, Radio, Video, X
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";

const myReports = [
  { 
    id: "RPT-2026-156", 
    type: "Noise Complaint", 
    date: "2026-02-20", 
    location: "123 Oak Street",
    status: "Under Review", 
    priority: "Low",
    responseTime: "Pending",
    evidenceUploaded: false
  },
  { 
    id: "RPT-2026-132", 
    type: "Suspicious Activity", 
    date: "2026-02-15", 
    location: "456 Pine Avenue",
    status: "Resolved", 
    priority: "Medium",
    responseTime: "4.5 min",
    evidenceUploaded: true
  },
  { 
    id: "RPT-2026-098", 
    type: "Street Light Out", 
    date: "2026-02-10", 
    location: "789 Maple Road",
    status: "In Progress", 
    priority: "Low",
    responseTime: "Pending",
    evidenceUploaded: false
  },
];

const safetyAlerts = [
  { title: "Community Meeting", message: "Town hall meeting scheduled for Feb 25th", date: "2 days ago", type: "info" },
  { title: "Safety Advisory", message: "Increased patrols in downtown area", date: "3 days ago", type: "warning" },
  { title: "Road Closure", message: "Main St closed for maintenance", date: "5 days ago", type: "alert" },
];

export default function UserDashboard() {
  const [incidentType, setIncidentType] = useState("");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [guardians, setGuardians] = useState([
    { id: "1", name: "Jane Smith", phone: "+1 (555) 123-4567", email: "jane@example.com", verified: true },
    { id: "2", name: "Bob Johnson", phone: "+1 (555) 987-6543", email: "bob@example.com", verified: false },
  ]);
  const [newGuardian, setNewGuardian] = useState({ name: "", phone: "", email: "" });
  const [showAddGuardian, setShowAddGuardian] = useState(false);
  const [sosActive, setSosActive] = useState(false);
  const [sosStartTime, setSosStartTime] = useState<Date | null>(null);

  // Profile edit state
  const [editedName, setEditedName] = useState("");
  const [editedAge, setEditedAge] = useState("");
  const [editedPhone, setEditedPhone] = useState("");
  const [editedAddress, setEditedAddress] = useState("");

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("currentUser") || "{}");
    setCurrentUser(user);
    setEditedName(user.name || "");
    setEditedAge(user.age || "");
    setEditedPhone(user.phone || "");
    setEditedAddress(user.address || "");
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    alert("Report submitted successfully!");
    setIncidentType("");
    setLocation("");
    setDescription("");
  };

  const handleLogout = () => {
    localStorage.removeItem("isAuthenticated");
    localStorage.removeItem("currentUser");
    window.location.href = "/login";
  };

  const handleSaveProfile = () => {
    const updatedUser = {
      ...currentUser,
      name: editedName,
      age: editedAge,
      phone: editedPhone,
      address: editedAddress,
    };
    localStorage.setItem("currentUser", JSON.stringify(updatedUser));
    setCurrentUser(updatedUser);
    setIsEditingProfile(false);
    alert("Profile updated successfully!");
  };

  const handleAddGuardian = () => {
    if (newGuardian.name && newGuardian.phone && newGuardian.email) {
      setGuardians([...guardians, { ...newGuardian, id: Date.now().toString(), verified: false }]);
      setNewGuardian({ name: "", phone: "", email: "" });
      setShowAddGuardian(false);
    }
  };

  const handleRemoveGuardian = (id: string) => {
    setGuardians(guardians.filter(g => g.id !== id));
  };

  const handleVerifyGuardian = (id: string) => {
    setGuardians(guardians.map(g => g.id === id ? { ...g, verified: true } : g));
    alert("Verification email sent!");
  };

  const handleTriggerSOS = () => {
    setSosActive(true);
    setSosStartTime(new Date());
    alert("🚨 SOS Alert Triggered! Emergency services have been notified.");
  };

  const handleCancelSOS = () => {
    setSosActive(false);
    setSosStartTime(null);
    alert("SOS Alert cancelled.");
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-green-700 text-white shadow-lg">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to="/role-select">
                <Button variant="ghost" size="icon" className="text-white hover:bg-green-600">
                  <ArrowLeft className="w-5 h-5" />
                </Button>
              </Link>
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

      {/* SOS Active Banner */}
      {sosActive && (
        <div className="bg-red-600 text-white py-3">
          <div className="container mx-auto px-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="animate-pulse">
                <Radio className="w-6 h-6" />
              </div>
              <div>
                <p className="font-bold">🚨 SOS ACTIVE - Emergency Services Notified</p>
                <p className="text-sm">Started: {sosStartTime?.toLocaleTimeString()}</p>
              </div>
            </div>
            <Button variant="outline" onClick={handleCancelSOS} className="bg-white text-red-600 hover:bg-gray-100">
              <X className="w-4 h-4 mr-2" />
              Cancel SOS
            </Button>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <Tabs defaultValue="report" className="space-y-6">
          <TabsList>
            <TabsTrigger value="report">Report Incident</TabsTrigger>
            <TabsTrigger value="myreports">My Reports</TabsTrigger>
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="guardians">Guardians</TabsTrigger>
            {sosActive && <TabsTrigger value="tracking" className="bg-red-100">Live Tracking</TabsTrigger>}
          </TabsList>

          {/* Report Incident Tab */}
          <TabsContent value="report">
            <div className="grid lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5" />
                      Report an Incident
                    </CardTitle>
                    <CardDescription>
                      Help keep our community safe by reporting incidents
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                      <div>
                        <Label htmlFor="incident-type">Incident Type</Label>
                        <Select value={incidentType} onValueChange={setIncidentType}>
                          <SelectTrigger id="incident-type">
                            <SelectValue placeholder="Select incident type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="theft">Theft</SelectItem>
                            <SelectItem value="vandalism">Vandalism</SelectItem>
                            <SelectItem value="noise">Noise Complaint</SelectItem>
                            <SelectItem value="suspicious">Suspicious Activity</SelectItem>
                            <SelectItem value="traffic">Traffic Issue</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label htmlFor="location">Location</Label>
                        <Input
                          id="location"
                          placeholder="Enter street address or landmark"
                          value={location}
                          onChange={(e) => setLocation(e.target.value)}
                        />
                      </div>

                      <div>
                        <Label htmlFor="description">Description</Label>
                        <Textarea
                          id="description"
                          placeholder="Provide details about what happened..."
                          className="min-h-32"
                          value={description}
                          onChange={(e) => setDescription(e.target.value)}
                        />
                      </div>

                      <div>
                        <Label htmlFor="evidence">Upload Evidence (Optional)</Label>
                        <div className="mt-2 border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                          <Upload className="w-8 h-8 mx-auto text-gray-400 mb-2" />
                          <p className="text-sm text-gray-600">Click to upload photos or videos</p>
                          <input type="file" id="evidence" className="hidden" multiple accept="image/*,video/*" />
                        </div>
                      </div>

                      <Button type="submit" className="w-full">
                        <Send className="w-4 h-4 mr-2" />
                        Submit Report
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              </div>

              <div className="space-y-6">
                {/* Emergency SOS Button */}
                <Card className="bg-red-50 border-red-200">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-red-700">
                      <Shield className="w-5 h-5" />
                      Emergency SOS
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-700 mb-4">
                      Trigger SOS alert to notify emergency services and your guardians
                    </p>
                    {!sosActive ? (
                      <Button 
                        onClick={handleTriggerSOS}
                        className="w-full bg-red-600 hover:bg-red-700 text-white text-lg py-6"
                      >
                        <AlertTriangle className="w-6 h-6 mr-2" />
                        TRIGGER SOS
                      </Button>
                    ) : (
                      <div className="text-center">
                        <Badge className="bg-red-600 text-white animate-pulse text-lg py-2 px-4">
                          SOS ACTIVE
                        </Badge>
                      </div>
                    )}
                    <p className="text-xs text-gray-600 mt-2 text-center">
                      For life-threatening emergencies, call 911
                    </p>
                  </CardContent>
                </Card>

                {/* Safety Alerts */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Bell className="w-5 h-5" />
                      Safety Alerts
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {safetyAlerts.map((alert, index) => (
                        <div key={index} className="pb-4 border-b last:border-b-0 last:pb-0">
                          <div className="flex items-start gap-2">
                            <div className={`w-2 h-2 rounded-full mt-2 ${
                              alert.type === "warning" ? "bg-yellow-500" :
                              alert.type === "alert" ? "bg-red-500" :
                              "bg-blue-500"
                            }`}></div>
                            <div className="flex-1">
                              <p className="font-medium text-sm">{alert.title}</p>
                              <p className="text-sm text-gray-600 mt-1">{alert.message}</p>
                              <div className="flex items-center gap-1 mt-2 text-xs text-gray-500">
                                <Clock className="w-3 h-3" />
                                {alert.date}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* My Reports Tab */}
          <TabsContent value="myreports">
            <Card>
              <CardHeader>
                <CardTitle>My Reports</CardTitle>
                <CardDescription>Track the status of your submitted reports</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {myReports.map((report) => (
                    <div key={report.id} className="border rounded-lg p-4 hover:bg-gray-50">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-mono text-sm text-gray-600">{report.id}</p>
                            <Badge 
                              variant="outline"
                              className={
                                report.priority === "High" ? "border-red-500 text-red-700" :
                                report.priority === "Medium" ? "border-yellow-500 text-yellow-700" :
                                "border-gray-500 text-gray-700"
                              }
                            >
                              {report.priority}
                            </Badge>
                          </div>
                          <p className="font-medium text-lg">{report.type}</p>
                        </div>
                        <Badge 
                          className={
                            report.status === "Resolved" ? "bg-green-100 text-green-800" :
                            report.status === "Under Review" ? "bg-blue-100 text-blue-800" :
                            "bg-yellow-100 text-yellow-800"
                          }
                        >
                          {report.status}
                        </Badge>
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
                    <CardTitle>Profile Settings</CardTitle>
                    <CardDescription>Manage your personal information</CardDescription>
                  </div>
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
                  <div className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-6">
                      <div>
                        <Label className="text-gray-600">Full Name</Label>
                        <p className="text-lg">{currentUser?.name || "N/A"}</p>
                      </div>
                      <div>
                        <Label className="text-gray-600">Age</Label>
                        <p className="text-lg">{currentUser?.age || "N/A"}</p>
                      </div>
                      <div>
                        <Label className="text-gray-600">Email</Label>
                        <p className="text-lg">{currentUser?.email || "N/A"}</p>
                      </div>
                      <div>
                        <Label className="text-gray-600">Phone</Label>
                        <p className="text-lg">{currentUser?.phone || "N/A"}</p>
                      </div>
                    </div>
                    <div>
                      <Label className="text-gray-600">Address</Label>
                      <p className="text-lg">{currentUser?.address || "N/A"}</p>
                    </div>
                    <div>
                      <Label className="text-gray-600">ID Proof (Optional)</Label>
                      <div className="mt-2 border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                        <Upload className="w-8 h-8 mx-auto text-gray-400 mb-2" />
                        <p className="text-sm text-gray-600">Upload government-issued ID</p>
                        <input type="file" className="hidden" accept="image/*,application/pdf" />
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
                      </div>
                      <div className="flex gap-2">
                        {!guardian.verified && (
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handleVerifyGuardian(guardian.id)}
                          >
                            <UserCheck className="w-3 h-3 mr-1" />
                            Verify
                          </Button>
                        )}
                        <Button 
                          size="sm" 
                          variant="outline"
                          className="text-red-600 hover:bg-red-50"
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

          {/* Live Tracking Tab (Only visible when SOS is active) */}
          {sosActive && (
            <TabsContent value="tracking">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Radio className="w-5 h-5 text-red-600 animate-pulse" />
                    📡 Live Emergency Tracking
                  </CardTitle>
                  <CardDescription>Real-time location and response status</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {/* Map Placeholder */}
                    <div className="bg-gray-100 rounded-lg p-8 text-center border-2 border-dashed">
                      <MapPin className="w-12 h-12 mx-auto text-gray-400 mb-3" />
                      <p className="text-gray-600 mb-2">Real-time Location Map</p>
                      <p className="text-sm text-gray-500">Your location is being shared with emergency services</p>
                      <Button variant="outline" className="mt-4">
                        <Navigation className="w-4 h-4 mr-2" />
                        View in Google Maps
                      </Button>
                    </div>

                    {/* Emergency Info Cards */}
                    <div className="grid md:grid-cols-3 gap-4">
                      <Card className="bg-yellow-50 border-yellow-200">
                        <CardContent className="pt-6">
                          <div className="flex items-center gap-3">
                            <Users className="w-8 h-8 text-yellow-700" />
                            <div>
                              <p className="text-sm text-gray-600">Police Status</p>
                              <p className="font-medium text-yellow-700">Dispatched</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      <Card className="bg-blue-50 border-blue-200">
                        <CardContent className="pt-6">
                          <div className="flex items-center gap-3">
                            <UserCheck className="w-8 h-8 text-blue-700" />
                            <div>
                              <p className="text-sm text-gray-600">Assigned Officer</p>
                              <p className="font-medium text-blue-700">Officer Martinez</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      <Card className="bg-red-50 border-red-200">
                        <CardContent className="pt-6">
                          <div className="flex items-center gap-3">
                            <Video className="w-8 h-8 text-red-700" />
                            <div>
                              <p className="text-sm text-gray-600">Recording Status</p>
                              <p className="font-medium text-red-700 flex items-center gap-1">
                                <span className="w-2 h-2 bg-red-600 rounded-full animate-pulse"></span>
                                Recording
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Timeline */}
                    <div className="bg-white p-4 rounded-lg border">
                      <h4 className="font-medium mb-4">Emergency Response Timeline</h4>
                      <div className="space-y-4">
                        <div className="flex items-start gap-3">
                          <div className="w-2 h-2 bg-red-600 rounded-full mt-2"></div>
                          <div>
                            <p className="text-sm font-medium">SOS Triggered</p>
                            <p className="text-xs text-gray-600">{sosStartTime?.toLocaleTimeString()} - Emergency alert sent to all contacts</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <div className="w-2 h-2 bg-yellow-600 rounded-full mt-2"></div>
                          <div>
                            <p className="text-sm font-medium">Police Dispatched</p>
                            <p className="text-xs text-gray-600">Officer Martinez assigned - ETA: 3 minutes</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <div className="w-2 h-2 bg-blue-600 rounded-full mt-2"></div>
                          <div>
                            <p className="text-sm font-medium">Guardians Notified</p>
                            <p className="text-xs text-gray-600">{guardians.filter(g => g.verified).length} verified guardians alerted</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <Button 
                      variant="destructive" 
                      className="w-full"
                      onClick={handleCancelSOS}
                    >
                      <X className="w-4 h-4 mr-2" />
                      Cancel SOS Alert
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </Tabs>
      </main>
    </div>
  );
}
