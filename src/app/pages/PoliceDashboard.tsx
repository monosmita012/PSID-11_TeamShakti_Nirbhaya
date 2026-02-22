import { Fragment, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Calendar,
  CheckCircle,
  Download,
  FileText,
  MapPin,
  Mic,
  Navigation,
  Pencil,
  Phone,
  Radio,
  Search,
  Trash2,
  UserCheck,
  Video,
} from "lucide-react";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../components/ui/alert-dialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { Textarea } from "../components/ui/textarea";
import { getAuth, onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../../firebase";

type SOSAlert = {
  id: string;
  victimName: string;
  phone: string;
  location: string;
  triggeredAt: string;
  status: "Active" | "Dispatched" | "Resolved" | "False alarm";
  assignedOfficer?: string | null;
  lat: number;
  lng: number;
};

type Incident = {
  id: string;
  location: string;
  victimName: string;
  date: string;
  status: "Active" | "Investigating" | "Resolved";
};

 type StationProfile = {
  stationName: string;
  stationArea: string;
  stationLocation: string;
  areaType: string;
  email?: string;
  mobile?: string;
 };

const initialAlerts: SOSAlert[] = [
  {
    id: "SOS-2026-001",
    victimName: "Sarah Johnson",
    phone: "+1 (555) 123-4567",
    location: "123 Oak Street, Downtown",
    triggeredAt: new Date().toISOString(),
    status: "Active",
    assignedOfficer: null,
    lat: 40.7128,
    lng: -74.006,
  },
  {
    id: "SOS-2026-002",
    victimName: "Michael Chen",
    phone: "+1 (555) 987-6543",
    location: "456 Pine Avenue, Eastside",
    triggeredAt: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
    status: "Dispatched",
    assignedOfficer: "Officer Rodriguez",
    lat: 40.7589,
    lng: -73.9851,
  },
];

const initialHistory: Incident[] = [
  {
    id: "INC-2026-101",
    location: "Downtown Plaza",
    victimName: "John Smith",
    date: "2026-02-20",
    status: "Resolved",
  },
  {
    id: "INC-2026-102",
    location: "City Park",
    victimName: "Jane Doe",
    date: "2026-02-21",
    status: "Investigating",
  },
];

const officers = [
  { id: "P-1001", name: "Officer Martinez" },
  { id: "P-1002", name: "Officer Rodriguez" },
  { id: "P-1003", name: "Officer Chen" },
  { id: "P-1004", name: "Officer Smith" },
];

const formatDateTime = (iso: string) => new Date(iso).toLocaleString();

export default function PoliceDashboard() {
  const handleSaveProfile = async () => {
    if (!editProfile) return;
    setProfileLoading(true);
    try {
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) throw new Error("Not authenticated");
      await setDoc(doc(db, "station_profiles", user.uid), editProfile);
      setProfile(editProfile);
      setIsEditing(false);
      setProfileSaved(true);
      setProfileError(null);
      setTimeout(() => setProfileSaved(false), 2000);
    } catch (err: any) {
      setProfileError(err?.message || "Failed to save profile.");
    } finally {
      setProfileLoading(false);
    }
  };
    const handleLogout = async () => {
      try {
        const auth = getAuth();
        await signOut(auth);
      } catch { /* ignore */ }
      window.location.href = "/login";
    };
  const [sosAlerts, setSosAlerts] = useState<SOSAlert[]>(initialAlerts);
  const [historyIncidents, setHistoryIncidents] = useState<Incident[]>(initialHistory);
  const [sosStatuses, setSosStatuses] = useState<Record<string, SOSAlert["status"]>>({});
  const [sosOfficers, setSosOfficers] = useState<Record<string, string>>({});
  const [sosNotes, setSosNotes] = useState<Record<string, string>>({});
  const [selectedSOS, setSelectedSOS] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<SOSAlert["status"] | null>(null);
  const [searchDate, setSearchDate] = useState("");
  const [filterLocation, setFilterLocation] = useState("");

  // Profile state
  const [profile, setProfile] = useState<StationProfile | null>(null);
  const [editProfile, setEditProfile] = useState<StationProfile | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);

  useEffect(() => {
    setProfileLoading(true);
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        getDoc(doc(db, "station_profiles", user.uid)).then(snap => {
          if (snap.exists()) {
            const data = snap.data() as StationProfile;
            setProfile(data);
            setEditProfile(data);
          } else {
            const seed: StationProfile = {
              stationName: "",
              stationArea: "",
              stationLocation: "",
              areaType: "",
            };
            setProfile(seed);
            setEditProfile(seed);
            setIsEditing(true);
          }
        }).catch(err => {
          setProfileError(err?.message || "Failed to load station profile.");
        }).finally(() => {
          setProfileLoading(false);
        });
      } else {
        setProfile(null);
        setEditProfile(null);
        setProfileLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  const handleAssignOfficer = (id: string, officerName: string) => {
    setSosOfficers((prev) => ({ ...prev, [id]: officerName }));
  };

  const handleUpdateStatus = (id: string, status: SOSAlert["status"]) => {
    setSosStatuses((prev) => ({ ...prev, [id]: status }));
    setSosAlerts((prev) => prev.map((s) => (s.id === id ? { ...s, status } : s)));
    if (status === "Resolved") {
      setSelectedSOS(null);
      setStatusFilter(null);
    }
  };

  const handleAddNote = (id: string, note: string) => {
    setSosNotes((prev) => ({ ...prev, [id]: note }));
  };

  const openGoogleMaps = (lat: number, lng: number) => {
    window.open(`https://www.google.com/maps?q=${lat},${lng}`, "_blank");
  };

  const handlePlayMedia = (id: string, kind: "audio" | "video") => {
    alert(`Playing ${kind} for ${id}`);
  };

  const handleDownloadReport = (format: string) => {
    alert(`Downloading ${format} report`);
  };

  const handleHistoryStatusChange = (id: string, status: Incident["status"]) => {
    setHistoryIncidents((prev) => prev.map((h) => (h.id === id ? { ...h, status } : h)));
  };

  const handleDeleteAlert = (id: string) => {
    if (confirm('Are you sure you want to delete this alert? This action cannot be undone.')) {
      setSosAlerts((prev) => prev.filter((alert) => alert.id !== id));
      if (selectedSOS === id) {
        setSelectedSOS(null);
      }
    }
  };

  const getStatusColor = (status: SOSAlert["status"]) => {
    switch (status) {
      case "Active":
        return "bg-red-100 text-red-800 border-red-300";
      case "Dispatched":
        return "bg-yellow-100 text-yellow-800 border-yellow-300";
      case "Resolved":
        return "bg-green-100 text-green-800 border-green-300";
      case "False alarm":
        return "bg-gray-100 text-gray-800 border-gray-300";
      default:
        return "bg-blue-100 text-blue-800 border-blue-300";
    }
  };

  const getStatusEmoji = (status: SOSAlert["status"]) => {
    switch (status) {
      case "Active":
        return "🔴";
      case "Dispatched":
        return "🟡";
      case "Resolved":
        return "🟢";
      case "False alarm":
        return "⚫";
      default:
        return "🔵";
    }
  };

  const derivedAlerts = useMemo(
    () =>
      sosAlerts.map((a) => ({
        ...a,
        currentStatus: sosStatuses[a.id] || a.status,
      })),
    [sosAlerts, sosStatuses]
  );

  const filteredAlerts = useMemo(
    () => (statusFilter ? derivedAlerts.filter((a) => a.currentStatus === statusFilter) : derivedAlerts),
    [derivedAlerts, statusFilter]
  );

  const counts = useMemo(
    () => ({
      active: derivedAlerts.filter((a) => a.currentStatus === "Active").length,
      dispatched: derivedAlerts.filter((a) => a.currentStatus === "Dispatched").length,
      resolved: derivedAlerts.filter((a) => a.currentStatus === "Resolved").length,
    }),
    [derivedAlerts]
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Logout confirmation dialog */}
      <AlertDialog open={showLogoutDialog} onOpenChange={setShowLogoutDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Do you want to logout?</AlertDialogTitle>
            <AlertDialogDescription>
              You will be signed out and returned to the login page.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleLogout} className="bg-red-600 hover:bg-red-700">
              Logout
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <header className="bg-blue-900 text-white shadow-lg">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div>
                <h1 className="text-2xl">Police Command Center</h1>
                <p className="text-blue-200 text-sm">Real-time Emergency Response Dashboard</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {/* No Officer ID for station profile */}
              <Button
                variant="default"
                size="sm"
                onClick={() => setShowLogoutDialog(true)}
                className="bg-red-500 hover:bg-red-600 text-white font-semibold border-0 shadow"
              >
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card onClick={() => setStatusFilter("Active")} className="cursor-pointer hover:bg-blue-50 hover:border-blue-300 transition-colors">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-600" />
                Active
              </CardTitle>
              <CardDescription>Open emergencies</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{counts.active}</p>
            </CardContent>
          </Card>

          <Card onClick={() => setStatusFilter("Dispatched")} className="cursor-pointer hover:bg-blue-50 hover:border-blue-300 transition-colors">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Radio className="w-4 h-4 text-yellow-600" />
                Dispatched
              </CardTitle>
              <CardDescription>Teams on the way</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{counts.dispatched}</p>
            </CardContent>
          </Card>

          <Card onClick={() => setStatusFilter("Resolved")} className="cursor-pointer hover:bg-blue-50 hover:border-blue-300 transition-colors">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-600" />
                Resolved
              </CardTitle>
              <CardDescription>Closed incidents</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{counts.resolved}</p>
            </CardContent>
          </Card>
        </div>

        {statusFilter && (
          <div className="flex items-center gap-2 text-sm text-gray-700">
            <Badge variant="outline">Filtered by: {statusFilter}</Badge>
            <Button size="sm" variant="ghost" onClick={() => setStatusFilter(null)}>
              Remove Filter
            </Button>
          </div>
        )}

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-gray-700">
            <Badge variant="outline">Total Alerts: {derivedAlerts.length}</Badge>
          </div>
          <Button 
            size="sm" 
            variant="destructive" 
            onClick={() => {
              if (confirm('Are you sure you want to remove all alerts? This action cannot be undone.')) {
                setSosAlerts([]);
                setSelectedSOS(null);
                setStatusFilter(null);
              }
            }}
            className="bg-red-600 hover:bg-red-700"
          >
            Remove All Alerts
          </Button>
        </div>

        <Tabs defaultValue="sos" className="space-y-6">
          <TabsList className="w-full grid grid-cols-3 h-14">
            <TabsTrigger value="sos" className="flex items-center justify-center gap-2 text-base font-bold h-full">
              <AlertTriangle className="w-5 h-5" />
              Active SOS Alerts
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center justify-center gap-2 text-base font-bold h-full">
              <FileText className="w-5 h-5" />
              History & Reports
            </TabsTrigger>
            <TabsTrigger value="profile" className="flex items-center justify-center gap-2 text-base font-bold h-full">
              <UserCheck className="w-5 h-5" />
              Profile
            </TabsTrigger>
          </TabsList>

          <TabsContent value="sos">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2 font-extrabold">
                      <AlertTriangle className="w-5 h-5 text-red-600" />
                      Active SOS Alerts (Real-time)
                    </CardTitle>
                    <CardDescription>Emergency alerts requiring immediate attention</CardDescription>
                  </div>
                  <Badge className="bg-red-600 text-white animate-pulse">
                    {derivedAlerts.filter((s) => s.currentStatus !== "Resolved" && s.currentStatus !== "False alarm").length} Active
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="font-extrabold text-base">Emergency ID</TableHead>
                      <TableHead className="font-extrabold text-base">Victim Name</TableHead>
                      <TableHead className="font-extrabold text-base">Phone Number</TableHead>
                      <TableHead className="font-extrabold text-base">Time Triggered</TableHead>
                      <TableHead className="font-extrabold text-base">Audio</TableHead>
                      <TableHead className="font-extrabold text-base">Video</TableHead>
                      <TableHead className="font-extrabold text-base">Status</TableHead>
                      <TableHead className="font-extrabold text-base">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAlerts.map((alert) => (
                      <Fragment key={alert.id}>
                        <TableRow>
                          <TableCell className="font-mono text-sm">{alert.id}</TableCell>
                          <TableCell>{alert.victimName}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Phone className="w-3 h-3 text-gray-500" />
                              {alert.phone}
                            </div>
                          </TableCell>
                          <TableCell className="text-sm text-gray-600">{formatDateTime(alert.triggeredAt)}</TableCell>
                          <TableCell>
                            <Button size="icon" variant="outline" className="h-10 w-10" onClick={() => handlePlayMedia(alert.id, "audio")}> 
                              <Mic className="w-5 h-5" />
                            </Button>
                          </TableCell>
                          <TableCell>
                            <Button size="icon" variant="outline" className="h-10 w-10" onClick={() => handlePlayMedia(alert.id, "video")}> 
                              <Video className="w-5 h-5" />
                            </Button>
                          </TableCell>
                          <TableCell>
                            <Badge className={getStatusColor(alert.currentStatus as SOSAlert["status"])}>
                              {getStatusEmoji(alert.currentStatus as SOSAlert["status"])} {alert.currentStatus}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button size="sm" variant="outline" onClick={() => openGoogleMaps(alert.lat, alert.lng)}>
                                <Navigation className="w-3 h-3 mr-1" />
                                Live Location
                              </Button>
                              <Button size="sm" variant={selectedSOS === alert.id ? "default" : "outline"} onClick={() => setSelectedSOS(selectedSOS === alert.id ? null : alert.id)}>
                                {selectedSOS === alert.id ? "Hide" : "Manage"}
                              </Button>
                              <Button 
                                size="sm" 
                                variant="destructive" 
                                onClick={() => handleDeleteAlert(alert.id)}
                                className="bg-red-600 hover:bg-red-700 text-white"
                              >
                                <Trash2 className="w-3 h-3 mr-1" />
                                Delete
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>

                        {selectedSOS === alert.id && (
                          <TableRow>
                            <TableCell colSpan={8} className="bg-gray-50">
                              <div className="p-4">
                                <div className="space-y-2">
                                  <Label>Update Status</Label>
                                  <Select value={alert.currentStatus} onValueChange={(value) => handleUpdateStatus(alert.id, value as SOSAlert["status"])}>
                                    <SelectTrigger>
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="Active">🔴 Active</SelectItem>
                                      <SelectItem value="Dispatched">🟡 Dispatched</SelectItem>
                                      <SelectItem value="Resolved">🟢 Resolved</SelectItem>
                                      <SelectItem value="False alarm">⚫ False alarm</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </Fragment>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="font-extrabold">History & Reports</CardTitle>
                    <CardDescription>Search and filter past incidents</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => handleDownloadReport("CSV")}>
                      <Download className="w-4 h-4 mr-2" />
                      CSV
                    </Button>
                    <Button variant="outline" onClick={() => handleDownloadReport("PDF")}>
                      <Download className="w-4 h-4 mr-2" />
                      PDF
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="mb-6 grid md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Search by Date</Label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                      <Input type="date" className="pl-10" value={searchDate} onChange={(e) => setSearchDate(e.target.value)} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Filter by Location</Label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                      <Input placeholder="Enter location..." className="pl-10" value={filterLocation} onChange={(e) => setFilterLocation(e.target.value)} />
                    </div>
                  </div>
                  <div className="flex items-end">
                    <Button className="w-full">
                      <Search className="w-4 h-4 mr-2" />
                      Search
                    </Button>
                  </div>
                </div>

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="font-extrabold text-base">Emergency ID</TableHead>
                      <TableHead className="font-extrabold text-base">Location</TableHead>
                      <TableHead className="font-extrabold text-base">Victim Name</TableHead>
                      <TableHead className="font-extrabold text-base">Date</TableHead>
                      <TableHead className="font-extrabold text-base">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {historyIncidents
                      .filter((inc) => !searchDate || inc.date === searchDate)
                      .filter((inc) => !filterLocation || inc.location.toLowerCase().includes(filterLocation.toLowerCase()))
                      .map((incident) => (
                        <TableRow key={incident.id}>
                          <TableCell className="font-mono text-sm">{incident.id}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-gray-500" />
                              {incident.location}
                            </div>
                          </TableCell>
                          <TableCell>{incident.victimName}</TableCell>
                          <TableCell className="text-sm text-gray-600">{incident.date}</TableCell>
                          <TableCell>
                            <Select value={incident.status} onValueChange={(value) => handleHistoryStatusChange(incident.id, value as Incident["status"])}>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Investigating">Investigating</SelectItem>
                                <SelectItem value="Active">Active</SelectItem>
                                <SelectItem value="Resolved">Resolved</SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="profile">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Police Station Profile</CardTitle>
                  <CardDescription>Station details</CardDescription>
                </div>
                {!isEditing && (
                  <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                    <Pencil className="w-4 h-4 mr-2" />
                    Edit
                  </Button>
                )}
              </CardHeader>
              <CardContent>
                {profileSaved && (
                  <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-2 rounded text-sm">
                    ✓ Profile saved successfully
                  </div>
                )}
                {profileError && profile && (
                  <div className="mb-4 bg-yellow-50 border border-yellow-300 text-yellow-800 px-4 py-2 rounded text-sm">
                    ⚠ Could not load full profile from database. Showing available data. Please update your <strong>Firestore security rules</strong> to: <code>allow read, write: if request.auth.uid == userId;</code>
                  </div>
                )}
                {profileLoading ? (
                  <p className="text-sm text-gray-500">Loading profile...</p>
                ) : profileError && !profile ? (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm">{profileError}</div>
                ) : !profile ? (
                  <p className="text-sm text-gray-500">No profile data found.</p>
                ) : isEditing && editProfile ? (
                  <div className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <Label>Station Name</Label>
                        <Input value={editProfile.stationName} onChange={(e) => setEditProfile({ ...editProfile, stationName: e.target.value })} />
                      </div>
                      <div className="space-y-1">
                        <Label>Area</Label>
                        <Input value={editProfile.stationArea} onChange={(e) => setEditProfile({ ...editProfile, stationArea: e.target.value })} />
                      </div>
                      <div className="space-y-1">
                        <Label>Station Location</Label>
                        <Input value={editProfile.stationLocation} onChange={(e) => setEditProfile({ ...editProfile, stationLocation: e.target.value })} />
                      </div>
                      <div className="space-y-1">
                        <Label>Area Type</Label>
                        <Select value={editProfile.areaType} onValueChange={(v) => setEditProfile({ ...editProfile, areaType: v })}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="urban">Urban</SelectItem>
                            <SelectItem value="suburban">Suburban</SelectItem>
                            <SelectItem value="rural">Rural</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="flex gap-2 pt-2">
                      <Button onClick={handleSaveProfile}>Save Changes</Button>
                      <Button variant="outline" onClick={() => { setEditProfile(profile); setIsEditing(false); }}>Cancel</Button>
                    </div>
                  </div>
                ) : (
                  <div className="grid md:grid-cols-2 gap-y-4 gap-x-8 text-sm text-gray-800">
                    <div className="col-span-2">
                      <div className="rounded-xl border border-indigo-200 bg-white shadow-md p-6 flex flex-col md:flex-row gap-8 items-center">
                        <div className="flex flex-col items-center md:items-start gap-2 w-full md:w-1/2">
                          <span className="text-lg font-bold text-indigo-700">{profile.stationName || "-"}</span>
                          <span className="text-sm text-gray-500">Police Station</span>
                          <div className="mt-2 flex flex-col gap-1">
                            <span className="font-semibold text-gray-700">Email:</span>
                            <span className="text-base text-gray-900">{profile.email || "-"}</span>
                          </div>
                          <div className="mt-2 flex flex-col gap-1">
                            <span className="font-semibold text-gray-700">Mobile:</span>
                            <span className="text-base text-gray-900">{profile.mobile || "-"}</span>
                          </div>
                          <div className="mt-2 flex flex-col gap-1">
                            <span className="font-semibold text-gray-700">Area:</span>
                            <span className="text-base text-gray-900">{profile.stationArea || "-"}</span>
                          </div>
                          <div className="mt-2 flex flex-col gap-1">
                            <span className="font-semibold text-gray-700">Location:</span>
                            <span className="text-base text-gray-900">{profile.stationLocation || "-"}</span>
                          </div>
                          <div className="mt-2 flex flex-col gap-1">
                            <span className="font-semibold text-gray-700">Area Type:</span>
                            <span className="text-base text-gray-900 capitalize">{profile.areaType || "-"}</span>
                          </div>
                        </div>
                        <div className="flex flex-col items-center md:items-end w-full md:w-1/2">
                          <div className="bg-indigo-100 rounded-full w-24 h-24 flex items-center justify-center mb-4">
                            <svg width="48" height="48" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="48" height="48" rx="24" fill="#6366F1"/><text x="50%" y="50%" text-anchor="middle" dy=".3em" font-size="20" fill="#fff">🏢</text></svg>
                          </div>
                          <span className="text-indigo-600 font-semibold text-lg">{profile.stationName || "-"}</span>
                          <span className="text-gray-500 text-sm">{profile.stationArea || "-"} / {profile.areaType || "-"}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}