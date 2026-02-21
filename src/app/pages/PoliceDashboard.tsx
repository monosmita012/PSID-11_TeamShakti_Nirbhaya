import { useState } from "react";
import { Link } from "react-router";
import { 
  ArrowLeft, AlertCircle, CheckCircle, Clock, TrendingUp, Users, 
  FileText, MapPin, LogOut, AlertTriangle, Phone, Navigation, 
  UserCheck, MessageSquare, Download, Search, Filter, Calendar
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Textarea } from "../components/ui/textarea";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";

const stats = [
  { label: "Active SOS", value: "3", icon: AlertTriangle, color: "text-red-600" },
  { label: "Dispatched", value: "5", icon: Users, color: "text-yellow-600" },
  { label: "Resolved Today", value: "12", icon: CheckCircle, color: "text-green-600" },
  { label: "Response Time", value: "4.2m", icon: Clock, color: "text-blue-600" },
];

const sosAlerts = [
  { 
    id: "SOS-2026-001", 
    victimName: "Sarah Johnson", 
    phone: "+1 (555) 123-4567",
    location: "123 Oak Street, Downtown",
    timeTriggered: "2 min ago",
    status: "Active",
    assignedOfficer: null,
    lat: 40.7128,
    lng: -74.0060,
  },
  { 
    id: "SOS-2026-002", 
    victimName: "Michael Chen", 
    phone: "+1 (555) 987-6543",
    location: "456 Pine Avenue, Eastside",
    timeTriggered: "15 min ago",
    status: "Dispatched",
    assignedOfficer: "Officer Rodriguez",
    lat: 40.7589,
    lng: -73.9851,
  },
  { 
    id: "SOS-2026-003", 
    victimName: "Emily Davis", 
    phone: "+1 (555) 456-7890",
    location: "789 Maple Road, Westend",
    timeTriggered: "8 min ago",
    status: "Active",
    assignedOfficer: null,
    lat: 40.7282,
    lng: -73.7949,
  },
];

const recentIncidents = [
  { 
    id: "INC-2026-001", 
    type: "Theft", 
    location: "Downtown Plaza", 
    status: "Resolved", 
    priority: "High", 
    date: "2026-02-21",
    responseTime: "5.2 min",
    reporter: "John Smith"
  },
  { 
    id: "INC-2026-002", 
    type: "Vandalism", 
    location: "City Park", 
    status: "Investigating", 
    priority: "Medium", 
    date: "2026-02-21",
    responseTime: "8.1 min",
    reporter: "Jane Doe"
  },
  { 
    id: "INC-2026-003", 
    type: "Traffic Accident", 
    location: "Main Street", 
    status: "Resolved", 
    priority: "Low", 
    date: "2026-02-20",
    responseTime: "3.5 min",
    reporter: "Bob Wilson"
  },
];

const officers = [
  { id: "P-1001", name: "Officer Martinez" },
  { id: "P-1002", name: "Officer Rodriguez" },
  { id: "P-1003", name: "Officer Chen" },
  { id: "P-1004", name: "Officer Smith" },
];

export default function PoliceDashboard() {
  const [selectedSOS, setSelectedSOS] = useState<string | null>(null);
  const [sosStatuses, setSosStatuses] = useState<Record<string, string>>({});
  const [sosOfficers, setSosOfficers] = useState<Record<string, string>>({});
  const [sosNotes, setSosNotes] = useState<Record<string, string>>({});
  const [searchDate, setSearchDate] = useState("");
  const [filterLocation, setFilterLocation] = useState("");

  const handleLogout = () => {
    localStorage.removeItem("isAuthenticated");
    localStorage.removeItem("currentUser");
    window.location.href = "/login";
  };

  const handleAssignOfficer = (sosId: string, officerId: string) => {
    setSosOfficers({ ...sosOfficers, [sosId]: officerId });
  };

  const handleUpdateStatus = (sosId: string, status: string) => {
    setSosStatuses({ ...sosStatuses, [sosId]: status });
  };

  const handleAddNote = (sosId: string, note: string) => {
    setSosNotes({ ...sosNotes, [sosId]: note });
  };

  const openGoogleMaps = (lat: number, lng: number) => {
    window.open(`https://www.google.com/maps?q=${lat},${lng}`, "_blank");
  };

  const handleDownloadReport = (format: string) => {
    alert(`Downloading report in ${format} format...`);
  };

  const getStatusColor = (status: string) => {
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

  const getStatusEmoji = (status: string) => {
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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-blue-900 text-white shadow-lg">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to="/role-select">
                <Button variant="ghost" size="icon" className="text-white hover:bg-blue-800">
                  <ArrowLeft className="w-5 h-5" />
                </Button>
              </Link>
              <div>
                <h1 className="text-2xl">Police Command Center</h1>
                <p className="text-blue-200 text-sm">Real-time Emergency Response Dashboard</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-blue-800 text-white border-blue-700">
                Officer ID: P-1245
              </Badge>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={handleLogout}
                className="text-white hover:bg-blue-800"
              >
                <LogOut className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {stats.map((stat) => (
            <Card key={stat.label}>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">{stat.label}</p>
                    <p className="text-3xl">{stat.value}</p>
                  </div>
                  <stat.icon className={`w-8 h-8 ${stat.color}`} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Tabs defaultValue="sos" className="space-y-6">
          <TabsList>
            <TabsTrigger value="sos" className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              Active SOS Alerts
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              History & Reports
            </TabsTrigger>
          </TabsList>

          {/* Active SOS Alerts */}
          <TabsContent value="sos">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5 text-red-600" />
                      Active SOS Alerts (Real-time)
                    </CardTitle>
                    <CardDescription>Emergency alerts requiring immediate attention</CardDescription>
                  </div>
                  <Badge className="bg-red-600 text-white animate-pulse">
                    {sosAlerts.filter(s => sosStatuses[s.id] !== "Resolved" && sosStatuses[s.id] !== "False alarm").length} Active
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Emergency ID</TableHead>
                      <TableHead>Victim Name</TableHead>
                      <TableHead>Phone Number</TableHead>
                      <TableHead>Time Triggered</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sosAlerts.map((alert) => (
                      <>
                        <TableRow key={alert.id}>
                          <TableCell className="font-mono text-sm">{alert.id}</TableCell>
                          <TableCell>{alert.victimName}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Phone className="w-3 h-3 text-gray-500" />
                              {alert.phone}
                            </div>
                          </TableCell>
                          <TableCell className="text-sm text-gray-600">{alert.timeTriggered}</TableCell>
                          <TableCell>
                            <Badge className={getStatusColor(sosStatuses[alert.id] || alert.status)}>
                              {getStatusEmoji(sosStatuses[alert.id] || alert.status)} {sosStatuses[alert.id] || alert.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => openGoogleMaps(alert.lat, alert.lng)}
                              >
                                <Navigation className="w-3 h-3 mr-1" />
                                Live Location
                              </Button>
                              <Button 
                                size="sm" 
                                variant={selectedSOS === alert.id ? "default" : "outline"}
                                onClick={() => setSelectedSOS(selectedSOS === alert.id ? null : alert.id)}
                              >
                                {selectedSOS === alert.id ? "Hide" : "Manage"}
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                        {selectedSOS === alert.id && (
                          <TableRow>
                            <TableCell colSpan={6} className="bg-gray-50">
                              <div className="p-4 space-y-4">
                                <div className="grid md:grid-cols-2 gap-4">
                                  <div className="space-y-2">
                                    <Label>Assign Officer</Label>
                                    <Select 
                                      value={sosOfficers[alert.id] || alert.assignedOfficer || ""}
                                      onValueChange={(value) => handleAssignOfficer(alert.id, value)}
                                    >
                                      <SelectTrigger>
                                        <SelectValue placeholder="Select officer" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {officers.map((officer) => (
                                          <SelectItem key={officer.id} value={officer.name}>
                                            <div className="flex items-center gap-2">
                                              <UserCheck className="w-4 h-4" />
                                              {officer.name} ({officer.id})
                                            </div>
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </div>

                                  <div className="space-y-2">
                                    <Label>Update Status</Label>
                                    <Select 
                                      value={sosStatuses[alert.id] || alert.status}
                                      onValueChange={(value) => handleUpdateStatus(alert.id, value)}
                                    >
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

                                <div className="space-y-2">
                                  <Label>Internal Notes</Label>
                                  <Textarea 
                                    placeholder="Add internal notes about this emergency..."
                                    value={sosNotes[alert.id] || ""}
                                    onChange={(e) => handleAddNote(alert.id, e.target.value)}
                                  />
                                </div>

                                <div className="bg-white p-4 rounded-lg border">
                                  <h4 className="font-medium mb-3">Response Timeline</h4>
                                  <div className="space-y-3">
                                    <div className="flex items-start gap-3">
                                      <div className="w-2 h-2 bg-red-600 rounded-full mt-2"></div>
                                      <div>
                                        <p className="text-sm font-medium">SOS Triggered</p>
                                        <p className="text-xs text-gray-600">{alert.timeTriggered} - Location: {alert.location}</p>
                                      </div>
                                    </div>
                                    {(sosOfficers[alert.id] || alert.assignedOfficer) && (
                                      <div className="flex items-start gap-3">
                                        <div className="w-2 h-2 bg-yellow-600 rounded-full mt-2"></div>
                                        <div>
                                          <p className="text-sm font-medium">Officer Assigned</p>
                                          <p className="text-xs text-gray-600">{sosOfficers[alert.id] || alert.assignedOfficer}</p>
                                        </div>
                                      </div>
                                    )}
                                    {sosStatuses[alert.id] === "Resolved" && (
                                      <div className="flex items-start gap-3">
                                        <div className="w-2 h-2 bg-green-600 rounded-full mt-2"></div>
                                        <div>
                                          <p className="text-sm font-medium">Emergency Resolved</p>
                                          <p className="text-xs text-gray-600">Victim is safe</p>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* History & Reports */}
          <TabsContent value="history">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>History & Reports</CardTitle>
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
                      <Input 
                        type="date" 
                        className="pl-10"
                        value={searchDate}
                        onChange={(e) => setSearchDate(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Filter by Location</Label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                      <Input 
                        placeholder="Enter location..."
                        className="pl-10"
                        value={filterLocation}
                        onChange={(e) => setFilterLocation(e.target.value)}
                      />
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
                      <TableHead>Incident ID</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Reporter</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Response Time</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentIncidents
                      .filter(inc => !searchDate || inc.date === searchDate)
                      .filter(inc => !filterLocation || inc.location.toLowerCase().includes(filterLocation.toLowerCase()))
                      .map((incident) => (
                        <TableRow key={incident.id}>
                          <TableCell className="font-mono text-sm">{incident.id}</TableCell>
                          <TableCell>{incident.type}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-gray-500" />
                              {incident.location}
                            </div>
                          </TableCell>
                          <TableCell>{incident.reporter}</TableCell>
                          <TableCell className="text-sm text-gray-600">{incident.date}</TableCell>
                          <TableCell className="text-sm">{incident.responseTime}</TableCell>
                          <TableCell>
                            <Badge 
                              className={
                                incident.status === "Resolved" 
                                  ? "bg-green-100 text-green-800" 
                                  : "bg-blue-100 text-blue-800"
                              }
                            >
                              {incident.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Analytics
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-4">View crime statistics and trends</p>
              <Button variant="outline" className="w-full">View Analytics</Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="w-5 h-5" />
                Map View
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-4">See incidents on interactive map</p>
              <Button variant="outline" className="w-full">Open Map</Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Team
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-4">Manage officers and assignments</p>
              <Button variant="outline" className="w-full">Manage Team</Button>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
