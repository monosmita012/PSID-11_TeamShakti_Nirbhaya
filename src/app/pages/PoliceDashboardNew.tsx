import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router";
import { Shield, Video, MapPin, Clock, Users, LogOut, Phone, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { signOut, getAuth } from "firebase/auth";
import { ref, onValue, update } from "firebase/database";
import { database } from "../firebase-config";
import { WebRTCManager } from "../components/WebRTCManager";
import ChatSystem from "../components/ChatSystem";
import NotificationSystem from "../components/NotificationSystem";
import { NotificationService } from "../services/NotificationService";
import MapView from "../components/MapView";
import SessionRecorder from "../components/SessionRecorder";

interface Session {
  sessionId: string;
  victimId: string;
  status: string;
  timestamp: number;
  offer?: any;
  iceCandidates?: any[];
  location?: { lat: number; lng: number };
  endedAt?: number;
}

export default function PoliceDashboardNew() {
  const navigate = useNavigate();
  const auth = getAuth();
  const [activeSessions, setActiveSessions] = useState<Session[]>([]);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const webrtcManager = useRef<WebRTCManager | null>(null);

  useEffect(() => {
    // Initialize notification service
    const notificationService = NotificationService.getInstance();
    notificationService.initialize();

    // Listen for active sessions
    const sessionsRef = ref(database, 'sessions');
    const unsubscribe = onValue(sessionsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const sessions = Object.values(data).filter(
          (session: any) => session && session.status === 'active'
        ) as Session[];
        setActiveSessions(sessions);
      } else {
        setActiveSessions([]);
      }
    });

    return () => {
      unsubscribe();
      if (webrtcManager.current) {
        webrtcManager.current.close();
      }
    };
  }, []);

  const connectToSession = async (session: Session) => {
    try {
      setIsConnecting(true);
      setSelectedSession(session);

      // Initialize WebRTC manager
      webrtcManager.current = new WebRTCManager();
      
      webrtcManager.current.onRemoteStream = (stream) => {
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = stream;
        }
        setIsConnected(true);
        setIsConnecting(false);
      };

      // Create answer to victim's offer
      if (session.offer) {
        const answer = await webrtcManager.current.createAnswer(session.offer);
        
        // Save answer to Firebase
        const sessionRef = ref(database, `sessions/${session.sessionId}`);
        await update(sessionRef, {
          ...session,
          answer: answer
        });

        // Handle ICE candidates
        if (session.iceCandidates) {
          for (const candidate of session.iceCandidates) {
            await webrtcManager.current.addIceCandidate(candidate);
          }
        }

        // Listen for new ICE candidates
        const candidatesRef = ref(database, `sessions/${session.sessionId}/iceCandidates`);
        onValue(candidatesRef, (snapshot) => {
          const candidates = snapshot.val();
          if (candidates) {
            Object.values(candidates).forEach(async (candidate: any) => {
              if (webrtcManager.current) {
                await webrtcManager.current.addIceCandidate(candidate);
              }
            });
          }
        });
      }
    } catch (error) {
      console.error('Error connecting to session:', error);
      setIsConnecting(false);
      alert('Failed to connect to session');
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

      setIsConnected(false);
      setSelectedSession(null);
    } catch (error) {
      console.error('Error disconnecting:', error);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate('/');
    } catch (error) {
      console.error('Error signing out:', error);
    }
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <Shield className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Police Dashboard</h1>
              <p className="text-sm text-gray-600">Women Safety System</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <NotificationSystem />
            <Badge variant="outline" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              {activeSessions.length} Active Sessions
            </Badge>
            <Button onClick={handleLogout} variant="outline" className="flex items-center gap-2">
              <LogOut className="w-4 h-4" />
              Logout
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Active Sessions List */}
          <div className="lg:col-span-1 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                  Active SOS Sessions
                </CardTitle>
                <CardDescription>
                  Click on a session to connect and view live stream
                </CardDescription>
              </CardHeader>
              <CardContent>
                {activeSessions.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <AlertTriangle className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>No active SOS sessions</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {activeSessions.map((session) => (
                      <div
                        key={session.sessionId}
                        className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                          selectedSession?.sessionId === session.sessionId
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                        onClick={() => !isConnected && connectToSession(session)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
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
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Map View */}
            {selectedSession && (
              <MapView 
                location={selectedSession.location || null}
                sessionId={selectedSession.sessionId}
                victimId={selectedSession.victimId}
              />
            )}
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

            {/* Session Recorder */}
            {selectedSession && (
              <SessionRecorder 
                sessionId={selectedSession.sessionId}
                isRecording={isRecording}
                onRecordingChange={setIsRecording}
              />
            )}

            {/* Chat System */}
            {selectedSession && (
              <ChatSystem sessionId={selectedSession.sessionId} userRole="police" />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
