import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router";
import { AlertTriangle, Video, VideoOff, Mic, MicOff, Phone, MapPin, Shield, LogOut } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { signOut, getAuth } from "firebase/auth";
import { ref, set, onValue, push } from "firebase/database";
import { database } from "../firebase-config";
import { WebRTCManager } from "../components/WebRTCManager";
import EmergencyContacts from "../components/EmergencyContacts";
import ChatSystem from "../components/ChatSystem";
import PanicButton from "../components/PanicButton";
import ThemeToggle from "../components/ThemeToggle";
import { useTheme } from "../contexts/ThemeContext";
import { useLanguage } from "../contexts/LanguageContext";

interface Session {
  sessionId: string;
  victimId: string;
  status: string;
  timestamp: number;
  offer?: any;
  iceCandidates?: any[];
}

export default function VictimDashboard() {
  const navigate = useNavigate();
  const auth = getAuth();
  const { theme } = useTheme();
  const { t } = useLanguage();
  const [isStreaming, setIsStreaming] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [currentSession, setCurrentSession] = useState<Session | null>(null);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const webrtcManager = useRef<WebRTCManager | null>(null);

  useEffect(() => {
    // Get user location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (error) => {
          console.error('Error getting location:', error);
        }
      );
    }

    // Initialize WebRTC manager
    webrtcManager.current = new WebRTCManager();
    
    webrtcManager.current.onRemoteStream = (stream) => {
      console.log('Remote stream received:', stream);
    };

    return () => {
      if (webrtcManager.current) {
        webrtcManager.current.close();
      }
    };
  }, []);

  const startSOS = async () => {
    try {
      if (!auth.currentUser) {
        throw new Error('User not authenticated');
      }

      // Start local stream
      const stream = await webrtcManager.current!.startLocalStream();
      
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      // Generate unique session ID
      const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Create WebRTC offer
      const offer = await webrtcManager.current!.createOffer();
      
      // Save session to Firebase
      const sessionRef = ref(database, `sessions/${sessionId}`);
      await set(sessionRef, {
        sessionId,
        victimId: auth.currentUser.uid,
        status: 'active',
        timestamp: Date.now(),
        offer: offer,
        iceCandidates: [],
        location: location
      });

      // Listen for ICE candidates
      webrtcManager.current!.onIceCandidate = async (candidate) => {
        const candidatesRef = ref(database, `sessions/${sessionId}/iceCandidates`);
        await push(candidatesRef, candidate);
      };

      setCurrentSession({
        sessionId,
        victimId: auth.currentUser.uid,
        status: 'active',
        timestamp: Date.now(),
        offer: offer
      });

      setIsStreaming(true);
    } catch (error) {
      console.error('Error starting SOS:', error);
      alert('Failed to start SOS. Please check camera and microphone permissions.');
    }
  };

  const stopSOS = async () => {
    try {
      if (webrtcManager.current) {
        webrtcManager.current.stopLocalStream();
      }

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = null;
      }

      // Update session status
      if (currentSession) {
        const sessionRef = ref(database, `sessions/${currentSession.sessionId}`);
        await set(sessionRef, {
          ...currentSession,
          status: 'ended',
          endedAt: Date.now()
        });
      }

      setIsStreaming(false);
      setCurrentSession(null);
    } catch (error) {
      console.error('Error stopping SOS:', error);
    }
  };

  const toggleMute = () => {
    if (webrtcManager.current && webrtcManager.current.getLocalStream()) {
      const audioTracks = webrtcManager.current.getLocalStream()!.getAudioTracks();
      audioTracks.forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsMuted(!isMuted);
    }
  };

  const toggleVideo = () => {
    if (webrtcManager.current && webrtcManager.current.getLocalStream()) {
      const videoTracks = webrtcManager.current.getLocalStream()!.getVideoTracks();
      videoTracks.forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsVideoOff(!isVideoOff);
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-pink-50 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
              <Shield className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{t('dashboard')}</h1>
              <p className="text-sm text-gray-600">Women Safety System</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <ThemeToggle />
            <Button onClick={handleLogout} variant="outline" className="flex items-center gap-2">
              <LogOut className="w-4 h-4" />
              {t('logout')}
            </Button>
          </div>
        </div>

        {/* Location Info */}
        {location && (
          <Card className="mb-6">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <MapPin className="w-4 h-4" />
                <span>Location: {location.lat.toFixed(6)}, {location.lng.toFixed(6)}</span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Video Stream */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Video className="w-5 h-5" />
                Live Stream
              </CardTitle>
              <CardDescription>
                {isStreaming ? "Your live video is being streamed" : "Click SOS to start streaming"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="relative bg-black rounded-lg overflow-hidden aspect-video">
                <video
                  ref={localVideoRef}
                  autoPlay
                  muted
                  playsInline
                  className="w-full h-full object-cover"
                />
                {!isStreaming && (
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-900 bg-opacity-75">
                    <div className="text-center text-white">
                      <VideoOff className="w-12 h-12 mx-auto mb-2" />
                      <p>Camera not active</p>
                    </div>
                  </div>
                )}
                {isStreaming && (
                  <div className="absolute top-4 right-4">
                    <Badge variant="destructive" className="animate-pulse">
                      LIVE
                    </Badge>
                  </div>
                )}
              </div>

              {/* Video Controls */}
              {isStreaming && (
                <div className="flex justify-center gap-2 mt-4">
                  <Button
                    onClick={toggleMute}
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-2"
                  >
                    {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                    {isMuted ? 'Unmute' : 'Mute'}
                  </Button>
                  <Button
                    onClick={toggleVideo}
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-2"
                  >
                    {isVideoOff ? <VideoOff className="w-4 h-4" /> : <Video className="w-4 h-4" />}
                    {isVideoOff ? 'Video On' : 'Video Off'}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Emergency Section */}
          <div className="space-y-6">
            {/* Panic Button */}
            <PanicButton 
              onActivate={startSOS}
              isActivated={isStreaming}
              disabled={isStreaming}
            />

            {/* Session Info */}
            {currentSession && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-red-600" />
                    Active Emergency Session
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Badge variant="destructive" className="animate-pulse">
                        EMERGENCY ACTIVE
                      </Badge>
                    </div>
                    <div className="grid grid-cols-1 gap-2 text-sm">
                      <div>
                        <span className="text-gray-600">Session ID:</span>
                        <p className="font-mono text-xs">{currentSession.sessionId}</p>
                      </div>
                      <div>
                        <span className="text-gray-600">Status:</span>
                        <p>{currentSession.status}</p>
                      </div>
                      <div>
                        <span className="text-gray-600">Started:</span>
                        <p>{new Date(currentSession.timestamp).toLocaleString()}</p>
                      </div>
                    </div>
                    <div className="flex justify-center">
                      <Button
                        onClick={stopSOS}
                        variant="outline"
                        className="flex items-center gap-2"
                      >
                        <Phone className="w-4 h-4" />
                        End Emergency
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Emergency Contacts */}
            <EmergencyContacts />
          </div>
        </div>

        {/* Chat System */}
        {currentSession && (
          <div className="mt-6">
            <ChatSystem sessionId={currentSession.sessionId} userRole="victim" />
          </div>
        )}
      </div>
    </div>
  );
}
