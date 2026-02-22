import { useState, useEffect } from "react";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { Calendar, Clock, Users, AlertTriangle, TrendingUp, Activity } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { ref, onValue, get } from "firebase/database";
import { database } from "../firebase-config";

interface Session {
  sessionId: string;
  victimId: string;
  status: string;
  timestamp: number;
  endedAt?: number;
  location?: { lat: number; lng: number };
}

interface AnalyticsData {
  totalSessions: number;
  activeSessions: number;
  averageDuration: number;
  peakHours: { hour: number; count: number }[];
  weeklyTrend: { day: string; count: number }[];
  statusDistribution: { name: string; value: number; color: string }[];
}

export default function SessionAnalytics() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [timeRange, setTimeRange] = useState("7d"); // 7d, 30d, 90d

  useEffect(() => {
    const fetchSessions = async () => {
      const sessionsRef = ref(database, 'sessions');
      const snapshot = await get(sessionsRef);
      const data = snapshot.val();
      const now = Date.now();
      const timeRangeMap: { [key: string]: number } = {
        '7d': 7 * 24 * 60 * 60 * 1000,
        '30d': 30 * 24 * 60 * 60 * 1000,
        '90d': 90 * 24 * 60 * 60 * 1000
      };
      const timeRangeMs = timeRangeMap[timeRange] || 7 * 24 * 60 * 60 * 1000;
      
      if (data) {
        const sessionsList = Object.entries(data).map(([id, session]: [string, any]) => ({
          sessionId: id,
          ...session
        })) as Session[];
        
        const filteredSessions = sessionsList.filter(
          session => session.timestamp > now - timeRangeMs
        );
        
        setSessions(filteredSessions);
        calculateAnalytics(filteredSessions);
      }
    };

    fetchSessions();

    // Set up real-time listener
    const sessionsRef = ref(database, 'sessions');
    const unsubscribe = onValue(sessionsRef, (snapshot) => {
      const data = snapshot.val();
      const now = Date.now();
      const timeRangeMap: { [key: string]: number } = {
        '7d': 7 * 24 * 60 * 60 * 1000,
        '30d': 30 * 24 * 60 * 60 * 1000,
        '90d': 90 * 24 * 60 * 60 * 1000
      };
      const timeRangeMs = timeRangeMap[timeRange] || 7 * 24 * 60 * 60 * 1000;
      
      if (data) {
        const sessionsList = Object.entries(data).map(([id, session]: [string, any]) => ({
          sessionId: id,
          ...session
        })) as Session[];
        
        const filteredSessions = sessionsList.filter(
          session => session.timestamp > now - timeRangeMs
        );
        
        setSessions(filteredSessions);
        calculateAnalytics(filteredSessions);
      }
    });

    return () => unsubscribe();
  }, [timeRange]);

  const calculateAnalytics = (sessionsList: Session[]) => {
    const totalSessions = sessionsList.length;
    const activeSessions = sessionsList.filter(s => s.status === 'active').length;
    
    // Calculate average duration
    const endedSessions = sessionsList.filter(s => s.status === 'ended' && s.endedAt);
    const totalDuration = endedSessions.reduce((sum, session) => {
      return sum + (session.endedAt! - session.timestamp);
    }, 0);
    const averageDuration = endedSessions.length > 0 ? totalDuration / endedSessions.length : 0;

    // Peak hours analysis
    const hourCounts: { [key: number]: number } = {};
    sessionsList.forEach(session => {
      const hour = new Date(session.timestamp).getHours();
      hourCounts[hour] = (hourCounts[hour] || 0) + 1;
    });
    const peakHours = Array.from({ length: 24 }, (_, i) => ({
      hour: i,
      count: hourCounts[i] || 0
    }));

    // Weekly trend
    const dayCounts: { [key: string]: number } = {};
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    sessionsList.forEach(session => {
      const day = days[new Date(session.timestamp).getDay()];
      dayCounts[day] = (dayCounts[day] || 0) + 1;
    });
    const weeklyTrend = days.map(day => ({
      day,
      count: dayCounts[day] || 0
    }));

    // Status distribution
    const statusCounts = sessionsList.reduce((acc, session) => {
      acc[session.status] = (acc[session.status] || 0) + 1;
      return acc;
    }, {} as { [key: string]: number });

    const statusDistribution = Object.entries(statusCounts).map(([status, count]) => ({
      name: status.charAt(0).toUpperCase() + status.slice(1),
      value: count,
      color: status === 'active' ? '#ef4444' : status === 'ended' ? '#22c55e' : '#f59e0b'
    }));

    setAnalytics({
      totalSessions,
      activeSessions,
      averageDuration,
      peakHours,
      weeklyTrend,
      statusDistribution
    });
  };

  const formatDuration = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const hours = Math.floor(minutes / 60);
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    }
    return `${minutes}m`;
  };

  if (!analytics) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Session Analytics</h2>
          <p className="text-gray-600">Emergency session insights and trends</p>
        </div>
        <Select value={timeRange} onValueChange={setTimeRange}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7d">Last 7 days</SelectItem>
            <SelectItem value="30d">Last 30 days</SelectItem>
            <SelectItem value="90d">Last 90 days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Activity className="w-6 h-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Sessions</p>
                <p className="text-2xl font-bold text-gray-900">{analytics.totalSessions}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-red-100 rounded-lg">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Active Sessions</p>
                <p className="text-2xl font-bold text-gray-900">{analytics.activeSessions}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <Clock className="w-6 h-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Avg Duration</p>
                <p className="text-2xl font-bold text-gray-900">{formatDuration(analytics.averageDuration)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <TrendingUp className="w-6 h-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Response Rate</p>
                <p className="text-2xl font-bold text-gray-900">98%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Peak Hours Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Peak Hours</CardTitle>
            <CardDescription>SOS frequency by hour of day</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={analytics.peakHours}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="hour" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Weekly Trend */}
        <Card>
          <CardHeader>
            <CardTitle>Weekly Trend</CardTitle>
            <CardDescription>SOS frequency by day of week</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={analytics.weeklyTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="count" stroke="#10b981" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Status Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Session Status</CardTitle>
            <CardDescription>Distribution of session outcomes</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={analytics.statusDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {analytics.statusDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Recent Sessions */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Sessions</CardTitle>
            <CardDescription>Latest emergency sessions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {sessions.slice(0, 10).map((session) => (
                <div key={session.sessionId} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium text-sm">Session {session.sessionId.slice(-8)}</p>
                    <p className="text-xs text-gray-500">
                      {new Date(session.timestamp).toLocaleString()}
                    </p>
                  </div>
                  <Badge variant={session.status === 'active' ? 'destructive' : 'secondary'}>
                    {session.status}
                  </Badge>
                </div>
              ))}
              {sessions.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <Calendar className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No sessions in this time range</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
