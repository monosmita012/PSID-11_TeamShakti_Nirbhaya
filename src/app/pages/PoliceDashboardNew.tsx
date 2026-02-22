import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router";
import { Shield, Video, MapPin, Clock, Users, LogOut, Phone, AlertTriangle, User, ChevronDown, ChevronUp, Calendar } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { signOut, getAuth } from "firebase/auth";
import { ref, onValue, update, serverTimestamp, get } from "firebase/database";
import { database } from "../firebase-config";
import { WebRTCManager } from "../components/WebRTCManager";
import ChatSystem from "../components/ChatSystem";
import MapView from "../components/MapView";
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

interface Session {
  sessionId: string;
  victimId: string;
  status: string;
  timestamp: number;
  offer?: any;
  iceCandidates?: any[];
  location?: { lat: number; lng: number; address?: string };
  endedAt?: number;
  victimName?: string;
}

interface PoliceAlert {
  id: string;
  type: string;
  sessionId: string;
  victimId: string;
  victimName: string;
  location: { lat: number; lng: number; address?: string };
  address?: string;
  timestamp: number;
  status: string;
  createdAt: any;
}

export default function PoliceDashboardNew() {
  const navigate = useNavigate();
  const auth = getAuth();
  const [activeSessions, setActiveSessions] = useState<Session[]>([]);
  const [deactivatedSessions, setDeactivatedSessions] = useState<Session[]>([]);
  const [filteredActiveSessions, setFilteredActiveSessions] = useState<Session[]>([]);
  const [filteredDeactivatedSessions, setFilteredDeactivatedSessions] = useState<Session[]>([]);
  const [policeAlerts, setPoliceAlerts] = useState<PoliceAlert[]>([]);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [activeSosDropdown, setActiveSosDropdown] = useState(true);
  const [deactivatedSosDropdown, setDeactivatedSosDropdown] = useState(true);
  const [activeDateFilter, setActiveDateFilter] = useState("");
  const [deactivatedDateFilter, setDeactivatedDateFilter] = useState("");
  const [activeTimeFilter, setActiveTimeFilter] = useState("");
  const [deactivatedTimeFilter, setDeactivatedTimeFilter] = useState("");
  const [manageDropdown, setManageDropdown] = useState<string | null>(null);
  const [activeStartTime, setActiveStartTime] = useState("");
  const [activeEndTime, setActiveEndTime] = useState("");
  const [deactivatedStartTime, setDeactivatedStartTime] = useState("");
  const [deactivatedEndTime, setDeactivatedEndTime] = useState("");
  
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const webrtcManager = useRef<WebRTCManager | null>(null);

  useEffect(() => {
    // Listen for active sessions
    const sessionsRef = ref(database, 'sessions');
    const unsubscribeSessions = onValue(sessionsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const allSessions = Object.values(data) as Session[];
        const active = allSessions.filter(
          (session: any) => session && (session.status === 'active' || session.status === 'connecting') && !session.endedAt
        );
        const deactivated = allSessions.filter(
          (session: any) => session && (session.status === 'ended' || session.endedAt)
        );
        setActiveSessions(active);
        setDeactivatedSessions(deactivated);
        setFilteredActiveSessions(active);
        setFilteredDeactivatedSessions(deactivated);
      } else {
        setActiveSessions([]);
        setDeactivatedSessions([]);
        setFilteredActiveSessions([]);
        setFilteredDeactivatedSessions([]);
      }
    });

    // Listen for police alerts
    const alertsRef = ref(database, 'policeAlerts');
    const unsubscribeAlerts = onValue(alertsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const alerts = Object.entries(data)
          .map(([id, alert]: [string, any]) => ({
            id,
            ...alert
          }))
          .sort((a, b) => b.timestamp - a.timestamp)
          .filter(alert => alert.status === 'active' && !alert.endedAt);
        setPoliceAlerts(alerts);
      } else {
        setPoliceAlerts([]);
      }
    });

    return () => {
      unsubscribeSessions();
      unsubscribeAlerts();
      if (webrtcManager.current) {
        webrtcManager.current.close();
      }
    };
  }, []);

  const connectToSession = async (session: Session) => {
    try {
      setIsConnecting(true);
      setSelectedSession(session);

      // Always fetch full session from Firebase (alerts don't include offer/iceCandidates)
      const sessionRef = ref(database, `sessions/${session.sessionId}`);
      const snapshot = await get(sessionRef);
      const fullSession = snapshot.val();
      
      if (!fullSession?.offer) {
        setIsConnecting(false);
        alert('Session not ready yet. The victim may still be connecting. Please try again.');
        return;
      }

      // Initialize WebRTC manager
      webrtcManager.current = new WebRTCManager();
      
      webrtcManager.current.onRemoteStream = (stream) => {
        console.log('📹 Received remote stream from victim');
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = stream;
        }
        setIsConnected(true);
        setIsConnecting(false);
        console.log('✅ Live video stream connected successfully');
      };

      webrtcManager.current.onConnectionStateChange = (state: RTCPeerConnectionState) => {
        console.log('WebRTC Connection State:', state);
        if (state === 'connected') {
          setIsConnected(true);
          setIsConnecting(false);
        } else if (state === 'failed' || state === 'disconnected') {
          setIsConnected(false);
          setIsConnecting(false);
        }
      };

      // Send police ICE candidates to victim
      const policeCandidatesRef = ref(database, `sessions/${session.sessionId}/policeIceCandidates`);
      webrtcManager.current.onIceCandidate = async (candidate: RTCIceCandidate) => {
        try {
          const { push } = await import("firebase/database");
          await push(policeCandidatesRef, candidate.toJSON ? candidate.toJSON() : candidate);
        } catch (err) {
          console.error('Failed to send ICE candidate:', err);
        }
      };

      console.log('📞 Creating answer to victim offer');
      const answer = await webrtcManager.current.createAnswer(fullSession.offer);
      
      await update(sessionRef, {
        answer: answer,
        policeConnected: serverTimestamp()
      });

      // Add existing ICE candidates from victim and listen for new ones
      const addedCandidateKeys = new Set<string>();
      const addCandidate = async (key: string, candidate: any) => {
        if (!candidate || !(candidate.candidate || candidate.sdpMid !== undefined)) return;
        if (addedCandidateKeys.has(key)) return;
        try {
          await webrtcManager.current!.addIceCandidate(new RTCIceCandidate(candidate));
          addedCandidateKeys.add(key);
        } catch (err) {
          console.warn('Failed to add ICE candidate:', err);
        }
      };

      const iceCandidates = fullSession.iceCandidates || {};
      const existingCount = Object.keys(iceCandidates).length;
      if (existingCount > 0) {
        console.log('🧊 Adding', existingCount, 'ICE candidates from victim');
        for (const [key, candidate] of Object.entries(iceCandidates) as [string, RTCIceCandidateInit][]) {
          await addCandidate(key, candidate);
        }
      }

      const candidatesRef = ref(database, `sessions/${session.sessionId}/iceCandidates`);
      onValue(candidatesRef, (snapshot) => {
        const candidates = snapshot.val();
        if (!candidates || !webrtcManager.current) return;
        Object.entries(candidates).forEach(([key, candidate]: [string, any]) => {
          addCandidate(key, candidate);
        });
      });
    } catch (error) {
      console.error('Error connecting to session:', error);
      setIsConnecting(false);
      alert('Failed to connect to session. Please check your connection and try again.');
    }
  };

  const disconnectFromSession = async () => {
    try {
      if (webrtcManager.current) {
        webrtcManager.current.close();
        webrtcManager.current = null;
      }

      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = null;
      }

      // Update session status to ended
      if (selectedSession) {
        const sessionRef = ref(database, `sessions/${selectedSession.sessionId}`);
        await update(sessionRef, {
          ...selectedSession,
          status: 'ended',
          policeDisconnectedAt: serverTimestamp()
        });

        // Also update the corresponding police alert
        const alertsRef = ref(database, 'policeAlerts');
        const snapshot = await new Promise((resolve) => {
          onValue(alertsRef, (data) => resolve(data.val()));
        });
        
        if (snapshot) {
          Object.entries(snapshot).forEach(([id, alert]: [string, any]) => {
            if (alert.sessionId === selectedSession.sessionId && alert.status === 'active') {
              const alertRef = ref(database, `policeAlerts/${id}`);
              update(alertRef, { 
                status: 'ended', 
                policeDisconnectedAt: serverTimestamp() 
              });
            }
          });
        }
      }

      setIsConnected(false);
      setSelectedSession(null);
      
      console.log('✅ Disconnected from emergency session');
    } catch (error) {
      console.error('Error disconnecting:', error);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate('/auth');
    } catch (error) {
      console.error('Error signing out:', error);
    }
    setShowLogoutConfirm(false);
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  const getSessionDuration = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);
    return `${minutes}m ${seconds}s`;
  };

  // Filter sessions by date and time
  useEffect(() => {
    let filtered = activeSessions;
    
    // Filter by date
    if (activeDateFilter) {
      filtered = filtered.filter(session => {
        const sessionDate = new Date(session.timestamp).toISOString().split('T')[0];
        return sessionDate === activeDateFilter;
      });
    }
    
    // Filter by time range
    if (activeStartTime || activeEndTime) {
      filtered = filtered.filter(session => {
        const sessionTime = new Date(session.timestamp);
        const sessionMinutes = sessionTime.getHours() * 60 + sessionTime.getMinutes();
        
        if (activeStartTime) {
          const [startHours, startMinutes] = activeStartTime.split(':').map(Number);
          const startTotalMinutes = startHours * 60 + startMinutes;
          if (sessionMinutes < startTotalMinutes) return false;
        }
        
        if (activeEndTime) {
          const [endHours, endMinutes] = activeEndTime.split(':').map(Number);
          const endTotalMinutes = endHours * 60 + endMinutes;
          if (sessionMinutes > endTotalMinutes) return false;
        }
        
        return true;
      });
    }
    
    setFilteredActiveSessions(filtered);
  }, [activeDateFilter, activeStartTime, activeEndTime, activeSessions]);

  useEffect(() => {
    let filtered = deactivatedSessions;
    
    // Filter by date
    if (deactivatedDateFilter) {
      filtered = filtered.filter(session => {
        const sessionDate = new Date(session.timestamp).toISOString().split('T')[0];
        return sessionDate === deactivatedDateFilter;
      });
    }
    
    // Filter by time range
    if (deactivatedStartTime || deactivatedEndTime) {
      filtered = filtered.filter(session => {
        const sessionTime = new Date(session.timestamp);
        const sessionMinutes = sessionTime.getHours() * 60 + sessionTime.getMinutes();
        
        if (deactivatedStartTime) {
          const [startHours, startMinutes] = deactivatedStartTime.split(':').map(Number);
          const startTotalMinutes = startHours * 60 + startMinutes;
          if (sessionMinutes < startTotalMinutes) return false;
        }
        
        if (deactivatedEndTime) {
          const [endHours, endMinutes] = deactivatedEndTime.split(':').map(Number);
          const endTotalMinutes = endHours * 60 + endMinutes;
          if (sessionMinutes > endTotalMinutes) return false;
        }
        
        return true;
      });
    }
    
    setFilteredDeactivatedSessions(filtered);
  }, [deactivatedDateFilter, deactivatedStartTime, deactivatedEndTime, deactivatedSessions]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Police Dashboard</h1>
              <p className="text-sm text-gray-600">Emergency Response System</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={() => navigate('/police-profile')} variant="outline" className="flex items-center gap-2 border-blue-300 text-blue-600 hover:bg-blue-50">
              <User className="w-4 h-4" />
              Profile
            </Button>
            <Button onClick={() => setShowLogoutConfirm(true)} variant="outline" className="flex items-center gap-2">
              <LogOut className="w-4 h-4" />
              Logout
            </Button>
          </div>
        </div>

        {/* Emergency Alerts Section */}
        {policeAlerts.length > 0 && (
          <div className="mb-6">
            <Card className="border-red-200 bg-red-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-red-700">
                  <AlertTriangle className="w-5 h-5" />
                  Emergency Alerts ({policeAlerts.length})
                </CardTitle>
                <CardDescription>
                  New emergency requests requiring immediate attention
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {policeAlerts.slice(0, 3).map((alert) => (
                    <div key={alert.id} className="border border-red-200 rounded-lg p-4 bg-white">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h3 className="font-semibold text-lg text-red-700">
                            {alert.victimName} - Emergency Alert
                          </h3>
                          <p className="text-sm text-gray-600">
                            Session ID: {alert.sessionId}
                          </p>
                        </div>
                        <Badge variant="destructive" className="animate-pulse">
                          NEW
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-red-500" />
                          <div>
                            <p className="text-xs text-gray-500">Location</p>
                            <p className="text-sm font-medium">
                              {alert.address || `${alert.location.lat.toFixed(6)}, ${alert.location.lng.toFixed(6)}`}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-blue-500" />
                          <div>
                            <p className="text-xs text-gray-500">Time</p>
                            <p className="text-sm font-medium">
                              {formatTime(alert.timestamp)}
                            </p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex gap-2">
                        <Button
                          onClick={() => connectToSession({
                            sessionId: alert.sessionId,
                            victimId: alert.victimId,
                            status: 'active',
                            timestamp: alert.timestamp,
                            location: alert.location,
                            victimName: alert.victimName
                          } as Session)}
                          disabled={isConnecting}
                          className="flex items-center gap-2"
                        >
                          <Phone className="w-4 h-4" />
                          {isConnecting ? 'Connecting...' : 'Respond to Emergency'}
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => window.open(
                            `https://www.google.com/maps?q=${alert.location.lat},${alert.location.lng}`,
                            '_blank'
                          )}
                          className="flex items-center gap-2"
                        >
                          <MapPin className="w-4 h-4" />
                          View on Map
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Active Sessions List */}
          <div className="lg:col-span-1 space-y-6">
            {/* Active SOS Section */}
            <Card>
              <CardHeader>
                <div 
                  className="flex items-center justify-between cursor-pointer"
                  onClick={() => setActiveSosDropdown(!activeSosDropdown)}
                >
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-red-600" />
                    Active SOS ({activeSessions.length})
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    {(activeDateFilter || activeStartTime || activeEndTime) && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveDateFilter("");
                          setActiveStartTime("");
                          setActiveEndTime("");
                        }}
                        className="text-xs h-6 px-2"
                      >
                        Clear Filter
                      </Button>
                    )}
                    {activeSosDropdown ? 
                      <ChevronUp className="w-4 h-4 text-gray-600" /> : 
                      <ChevronDown className="w-4 h-4 text-gray-600" />
                    }
                  </div>
                </div>
              </CardHeader>
              {activeSosDropdown && (
                <CardContent>
                  {/* Date and Time Filters for Active SOS */}
                  <div className="mb-4 space-y-3">
                    <div>
                      <Label htmlFor="active-date-filter" className="text-sm font-medium">Filter by Date</Label>
                      <div className="relative">
                        <Calendar className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                        <Input 
                          id="active-date-filter"
                          type="date" 
                          className="pl-10" 
                          value={activeDateFilter} 
                          onChange={(e) => setActiveDateFilter(e.target.value)} 
                        />
                      </div>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Filter by Time Range</Label>
                      <div className="flex gap-2 items-center">
                        <div className="flex-1">
                          <Label htmlFor="active-start-time" className="text-xs text-gray-600">Start</Label>
                          <Input 
                            id="active-start-time"
                            type="time" 
                            value={activeStartTime} 
                            onChange={(e) => setActiveStartTime(e.target.value)} 
                          />
                        </div>
                        <span className="text-gray-500 mt-4">to</span>
                        <div className="flex-1">
                          <Label htmlFor="active-end-time" className="text-xs text-gray-600">End</Label>
                          <Input 
                            id="active-end-time"
                            type="time" 
                            value={activeEndTime} 
                            onChange={(e) => setActiveEndTime(e.target.value)} 
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                  {filteredActiveSessions.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <AlertTriangle className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p>No active SOS sessions</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {filteredActiveSessions.map((session) => (
                        <div
                          key={session.sessionId}
                          className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                            selectedSession?.sessionId === session.sessionId
                              ? 'border-blue-500 bg-blue-50'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <div className="flex items-start justify-between">
                            <div 
                              className="flex-1"
                              onClick={() => !isConnected && connectToSession(session)}
                            >
                              <div className="flex items-center gap-2 mb-1">
                                <Badge variant="destructive" className="text-xs">
                                  LIVE
                                </Badge>
                                <span className="text-xs text-gray-500">
                                  {getSessionDuration(session.timestamp)}
                                </span>
                              </div>
                              <p className="text-sm font-medium text-gray-900">
                                Session: {session.sessionId.slice(-8)}
                              </p>
                              <p className="text-xs text-gray-600">
                                Started: {formatTime(session.timestamp)}
                              </p>
                              {session.location && (
                                <div className="flex items-center gap-1 mt-1">
                                  <MapPin className="w-3 h-3 text-gray-400" />
                                  <span className="text-xs text-gray-600">
                                    {session.location.lat.toFixed(4)}, {session.location.lng.toFixed(4)}
                                  </span>
                                </div>
                              )}
                            </div>
                            <div className="relative">
                              <Button 
                                size="sm" 
                                variant="outline" 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setManageDropdown(manageDropdown === session.sessionId ? null : session.sessionId);
                                }}
                                className="text-xs"
                              >
                                Manage
                              </Button>
                              {manageDropdown === session.sessionId && (
                                <div className="absolute right-0 top-8 bg-white border border-gray-200 rounded-lg shadow-lg z-10 min-w-[120px]">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="w-full justify-start text-xs h-8 px-3"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setManageDropdown(null);
                                      // Filter to show only this session in active
                                      const sessionDate = new Date(session.timestamp).toISOString().split('T')[0];
                                      const sessionTime = new Date(session.timestamp);
                                      const hours = sessionTime.getHours();
                                      const minutes = sessionTime.getMinutes();
                                      const timeString = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
                                      setActiveDateFilter(sessionDate);
                                      setActiveTimeFilter(timeString);
                                      setDeactivatedDateFilter("");
                                      setDeactivatedTimeFilter("");
                                    }}
                                  >
                                    Show in Active
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="w-full justify-start text-xs h-8 px-3"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setManageDropdown(null);
                                      // Move this session to deactivated (simulate ending session)
                                      const sessionRef = ref(database, `sessions/${session.sessionId}`);
                                      update(sessionRef, {
                                        ...session,
                                        status: 'ended',
                                        endedAt: serverTimestamp()
                                      });
                                    }}
                                  >
                                    Mark Inactive
                                  </Button>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              )}
            </Card>

            {/* Deactivated SOS Section */}
            <Card>
              <CardHeader>
                <div 
                  className="flex items-center justify-between cursor-pointer"
                  onClick={() => setDeactivatedSosDropdown(!deactivatedSosDropdown)}
                >
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-gray-600" />
                    Deactivated SOS ({deactivatedSessions.length})
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    {(deactivatedDateFilter || deactivatedStartTime || deactivatedEndTime) && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeactivatedDateFilter("");
                          setDeactivatedStartTime("");
                          setDeactivatedEndTime("");
                        }}
                        className="text-xs h-6 px-2"
                      >
                        Clear Filter
                      </Button>
                    )}
                    {deactivatedSosDropdown ? 
                      <ChevronUp className="w-4 h-4 text-gray-600" /> : 
                      <ChevronDown className="w-4 h-4 text-gray-600" />
                    }
                  </div>
                </div>
              </CardHeader>
              {deactivatedSosDropdown && (
                <CardContent>
                  {/* Date and Time Filters for Deactivated SOS */}
                  <div className="mb-4 space-y-3">
                    <div>
                      <Label htmlFor="deactivated-date-filter" className="text-sm font-medium">Filter by Date</Label>
                      <div className="relative">
                        <Calendar className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                        <Input 
                          id="deactivated-date-filter"
                          type="date" 
                          className="pl-10" 
                          value={deactivatedDateFilter} 
                          onChange={(e) => setDeactivatedDateFilter(e.target.value)} 
                        />
                      </div>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Filter by Time Range</Label>
                      <div className="flex gap-2 items-center">
                        <div className="flex-1">
                          <Label htmlFor="deactivated-start-time" className="text-xs text-gray-600">Start</Label>
                          <Input 
                            id="deactivated-start-time"
                            type="time" 
                            value={deactivatedStartTime} 
                            onChange={(e) => setDeactivatedStartTime(e.target.value)} 
                          />
                        </div>
                        <span className="text-gray-500 mt-4">to</span>
                        <div className="flex-1">
                          <Label htmlFor="deactivated-end-time" className="text-xs text-gray-600">End</Label>
                          <Input 
                            id="deactivated-end-time"
                            type="time" 
                            value={deactivatedEndTime} 
                            onChange={(e) => setDeactivatedEndTime(e.target.value)} 
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                  {filteredDeactivatedSessions.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <AlertTriangle className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p>No deactivated SOS sessions</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {filteredDeactivatedSessions.map((session) => (
                        <div
                          key={session.sessionId}
                          className="p-3 border rounded-lg border-gray-200 bg-gray-50"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <Badge variant="secondary" className="text-xs">
                                  ENDED
                                </Badge>
                                <span className="text-xs text-gray-500">
                                  Duration: {session.endedAt ? getSessionDuration(session.timestamp) : 'Unknown'}
                                </span>
                              </div>
                              <p className="text-sm font-medium text-gray-900">
                                Session: {session.sessionId.slice(-8)}
                              </p>
                              <p className="text-xs text-gray-600">
                                Started: {formatTime(session.timestamp)}
                              </p>
                              {session.endedAt && (
                                <p className="text-xs text-gray-600">
                                  Ended: {formatTime(session.endedAt)}
                                </p>
                              )}
                              {session.location && (
                                <div className="flex items-center gap-1 mt-1">
                                  <MapPin className="w-3 h-3 text-gray-400" />
                                  <span className="text-xs text-gray-600">
                                    {session.location.lat.toFixed(4)}, {session.location.lng.toFixed(4)}
                                  </span>
                                </div>
                              )}
                            </div>
                            <div className="relative">
                              <Button 
                                size="sm" 
                                variant="outline" 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setManageDropdown(manageDropdown === session.sessionId ? null : session.sessionId);
                                }}
                                className="text-xs"
                              >
                                Manage
                              </Button>
                              {manageDropdown === session.sessionId && (
                                <div className="absolute right-0 top-8 bg-white border border-gray-200 rounded-lg shadow-lg z-10 min-w-[120px]">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="w-full justify-start text-xs h-8 px-3"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setManageDropdown(null);
                                      // Filter to show only this session in deactivated
                                      const sessionDate = new Date(session.timestamp).toISOString().split('T')[0];
                                      const sessionTime = new Date(session.timestamp);
                                      const hours = sessionTime.getHours();
                                      const minutes = sessionTime.getMinutes();
                                      const timeString = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
                                      setDeactivatedDateFilter(sessionDate);
                                      setDeactivatedTimeFilter(timeString);
                                      setActiveDateFilter("");
                                      setActiveTimeFilter("");
                                    }}
                                  >
                                    Show in Inactive
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="w-full justify-start text-xs h-8 px-3"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setManageDropdown(null);
                                      // Reactivate this session
                                      const sessionRef = ref(database, `sessions/${session.sessionId}`);
                                      update(sessionRef, {
                                        ...session,
                                        status: 'active',
                                        endedAt: null
                                      });
                                    }}
                                  >
                                    Mark Active
                                  </Button>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              )}
            </Card>
          </div>

          {/* Video Stream and Chat */}
          <div className="lg:col-span-2 space-y-6">
            {/* Video Stream */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Video className="w-5 h-5" />
                  Live Stream
                </CardTitle>
                <CardDescription>
                  {selectedSession 
                    ? isConnected 
                      ? "Connected to live stream"
                      : "Connecting to stream..."
                    : "Select a session to view live stream"
                  }
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="relative bg-black rounded-lg overflow-hidden aspect-video">
                  <video
                    ref={remoteVideoRef}
                    autoPlay
                    playsInline
                    className="w-full h-full object-cover"
                  />
                  {!selectedSession && (
                    <div className="absolute inset-0 flex items-center justify-center bg-gray-900 bg-opacity-75">
                      <div className="text-center text-white">
                        <Video className="w-12 h-12 mx-auto mb-2" />
                        <p>Select a session to view live stream</p>
                      </div>
                    </div>
                  )}
                  {isConnecting && (
                    <div className="absolute inset-0 flex items-center justify-center bg-gray-900 bg-opacity-75">
                      <div className="text-center text-white">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-2"></div>
                        <p>Connecting to stream...</p>
                      </div>
                    </div>
                  )}
                  {isConnected && selectedSession && (
                    <div className="absolute top-4 right-4">
                      <Badge variant="destructive" className="animate-pulse">
                        LIVE
                      </Badge>
                    </div>
                  )}
                </div>

                {/* Session Info and Controls */}
                {selectedSession && (
                  <div className="mt-4 space-y-4">
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <h4 className="font-medium text-gray-900 mb-2">Session Information</h4>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <span className="text-gray-600">Session ID:</span>
                          <p className="font-mono text-xs">{selectedSession.sessionId}</p>
                        </div>
                        <div>
                          <span className="text-gray-600">Victim ID:</span>
                          <p className="font-mono text-xs">{selectedSession.victimId}</p>
                        </div>
                        <div>
                          <span className="text-gray-600">Started:</span>
                          <p>{formatTime(selectedSession.timestamp)}</p>
                        </div>
                        <div>
                          <span className="text-gray-600">Duration:</span>
                          <p>{getSessionDuration(selectedSession.timestamp)}</p>
                        </div>
                        {selectedSession.location && (
                          <div className="col-span-2">
                            <span className="text-gray-600">Location:</span>
                            <p className="font-mono text-xs">
                              {selectedSession.location.lat}, {selectedSession.location.lng}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex justify-center">
                      <Button
                        onClick={disconnectFromSession}
                        variant="outline"
                        className="flex items-center gap-2"
                      >
                        <Phone className="w-4 h-4" />
                        Disconnect
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Victim Location Map */}
            {selectedSession && (
              <MapView 
                location={selectedSession.location || null}
                sessionId={selectedSession.sessionId}
                victimId={selectedSession.victimId}
              />
            )}

            {/* Chat System */}
            {selectedSession && (
              <ChatSystem sessionId={selectedSession.sessionId} userRole="police" />
            )}
          </div>
        </div>
      </div>

      <AlertDialog open={showLogoutConfirm} onOpenChange={setShowLogoutConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Logout</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to logout? You will need to sign in again to access your account.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleLogout} className="bg-red-500 hover:bg-red-600">
              Logout
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
