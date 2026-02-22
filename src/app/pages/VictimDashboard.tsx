import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router";
import { Shield, Video, VideoOff, Mic, MicOff, Phone, AlertTriangle, MapPin, LogOut } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { signOut, getAuth } from "firebase/auth";
import { ref, push, set, onValue, serverTimestamp, update } from "firebase/database";
import { database } from "../firebase-config";
import { WebRTCManager } from "../components/WebRTCManager";
import { getIceServers } from "../utils/iceServers";
import PanicButton from "../components/PanicButton";
import EmergencyContacts from "../components/EmergencyContacts";
import ChatSystem from "../components/ChatSystem";
import ThemeToggle from "../components/ThemeToggle";

interface Location {
  lat: number;
  lng: number;
  address?: string;
}

interface CurrentSession {
  sessionId: string;
  victimId: string;
  status: string;
  timestamp: number;
  offer?: any;
  location?: Location;
}

export default function VictimDashboard() {
  const navigate = useNavigate();
  const auth = getAuth();
  
  const [location, setLocation] = useState<Location | null>(null);
  const [address, setAddress] = useState<string>("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [currentSession, setCurrentSession] = useState<CurrentSession | null>(null);
  const [locationWatchId, setLocationWatchId] = useState<number | null>(null);
  
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const webrtcManager = useRef<WebRTCManager | null>(null);
  const sessionUnsubscribes = useRef<(() => void)[]>([]);

  // Get current location and address
  const getCurrentLocation = () => {
    return new Promise<Location>((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const loc = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          
          // Get address from coordinates
          try {
            const response = await fetch(
              `https://nominatim.openstreetmap.org/reverse?format=json&lat=${loc.lat}&lon=${loc.lng}&zoom=18&addressdetails=1`,
              {
                headers: {
                  'User-Agent': 'WomenSafetySystem/1.0'
                }
              }
            );
            const data = await response.json();
            const addr = data.display_name || `${loc.lat.toFixed(6)}, ${loc.lng.toFixed(6)}`;
            resolve({ ...loc, address: addr });
          } catch (error) {
            console.error('Error getting address:', error);
            resolve(loc);
          }
        },
        (error) => {
          console.error('Error getting location:', error);
          reject(error);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        }
      );
    });
  };

  // Start continuous location tracking
  const startLocationTracking = () => {
    if (!navigator.geolocation) return;

    const watchId = navigator.geolocation.watchPosition(
      async (position) => {
        const loc = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };
        
        setLocation(loc);
        
        // Get updated address
        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${loc.lat}&lon=${loc.lng}&zoom=18&addressdetails=1`,
            {
              headers: {
                'User-Agent': 'WomenSafetySystem/1.0'
              }
            }
          );
          const data = await response.json();
          const addr = data.display_name || `${loc.lat.toFixed(6)}, ${loc.lng.toFixed(6)}`;
          setAddress(addr);
          
          // Update session with new location
          if (currentSession) {
            const sessionRef = ref(database, `sessions/${currentSession.sessionId}`);
            await update(sessionRef, {
              location: { ...loc, address: addr },
              lastLocationUpdate: serverTimestamp()
            });
          }
        } catch (error) {
          console.error('Error updating address:', error);
        }
      },
      (error) => {
        console.error('Location tracking error:', error);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
    
    setLocationWatchId(watchId);
  };

  // Stop location tracking
  const stopLocationTracking = () => {
    if (locationWatchId !== null) {
      navigator.geolocation.clearWatch(locationWatchId);
      setLocationWatchId(null);
    }
  };

  useEffect(() => {
    // Get initial location
    getCurrentLocation().then((loc) => {
      setLocation(loc);
      if (loc.address) {
        setAddress(loc.address);
      }
    }).catch(console.error);

    return () => {
      stopLocationTracking();
    };
  }, []);

  const startSOS = async () => {
    try {
      // Get current location with address
      const currentLocation = await getCurrentLocation();
      setLocation(currentLocation);
      if (currentLocation.address) {
        setAddress(currentLocation.address);
      }

      // Initialize WebRTC with TURN servers for cross-network (different devices) connectivity
      const iceServers = await getIceServers();
      webrtcManager.current = new WebRTCManager({ iceServers });
      
      // Get user media with enhanced constraints
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facing: 'user'
        } as MediaTrackConstraints,
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } as MediaTrackConstraints
      });
      
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
      
      // Set stream in WebRTC manager and add tracks to peer connection
      webrtcManager.current.setLocalStream(stream);
      
      // Create WebRTC offer immediately
      const offer = await webrtcManager.current.createOffer();
      
      // Generate unique session ID
      const sessionId = `emergency_${Date.now()}_${auth.currentUser?.uid || 'unknown'}`;
      
      // Create emergency session with location and address
      const sessionData = {
        sessionId,
        victimId: auth.currentUser?.uid || 'unknown',
        victimName: auth.currentUser?.displayName || 'Anonymous',
        status: 'active',
        timestamp: Date.now(),
        location: currentLocation,
        address: currentLocation.address,
        offer,
        createdAt: serverTimestamp(),
        lastLocationUpdate: serverTimestamp()
      };
      
      // Save to Firebase
      await set(ref(database, `sessions/${sessionId}`), sessionData);
      
      // Send emergency notification to police dashboard
      await push(ref(database, 'policeAlerts'), {
        type: 'emergency',
        sessionId,
        victimId: auth.currentUser?.uid || 'unknown',
        victimName: auth.currentUser?.displayName || 'Anonymous',
        location: currentLocation,
        address: currentLocation.address,
        timestamp: Date.now(),
        status: 'active',
        createdAt: serverTimestamp()
      });

      // Listen for ICE candidates - push to Firebase for police
      webrtcManager.current.onIceCandidate = async (candidate) => {
        const candidatesRef = ref(database, `sessions/${sessionId}/iceCandidates`);
        const candidateData = candidate.toJSON ? candidate.toJSON() : candidate;
        await push(candidatesRef, candidateData);
      };

      // Listen for police answer (only process once)
      let answerHandled = false;
      const sessionRef = ref(database, `sessions/${sessionId}`);
      const unsubAnswer = onValue(sessionRef, async (snapshot) => {
        const data = snapshot.val();
        if (!data?.answer || !webrtcManager.current || answerHandled) return;
        try {
          await webrtcManager.current.handleAnswer(data.answer);
          answerHandled = true;
          console.log('✅ Received police answer - connection established');
        } catch (err) {
          console.warn('Failed to handle police answer:', err);
        }
      });

      const policeCandidatesRef = ref(database, `sessions/${sessionId}/policeIceCandidates`);
      const addedCandidates = new Set<string>();
      const unsubPoliceCandidates = onValue(policeCandidatesRef, async (snapshot) => {
        const candidates = snapshot.val();
        if (!candidates || !webrtcManager.current) return;
        for (const [key, candidate] of Object.entries(candidates) as [string, any][]) {
          if (addedCandidates.has(key) || !candidate || !(candidate.candidate || candidate.sdpMid !== undefined)) continue;
          try {
            await webrtcManager.current.addIceCandidate(new RTCIceCandidate(candidate));
            addedCandidates.add(key);
          } catch (err) {
            console.warn('Failed to add police ICE candidate:', err);
          }
        }
      });

      sessionUnsubscribes.current = [unsubAnswer, unsubPoliceCandidates];

      setCurrentSession({
        sessionId,
        victimId: auth.currentUser?.uid || 'unknown',
        status: 'active',
        timestamp: Date.now(),
        offer
      });

      setIsStreaming(true);
      
      // Start continuous location tracking
      startLocationTracking();
      
      console.log('✅ Emergency stream started successfully');
      
    } catch (error) {
      console.error('Error starting SOS:', error);
      alert('Failed to start SOS. Please check camera, microphone, and location permissions.');
    }
  };

  const stopSOS = async () => {
    try {
      // Unsubscribe from Firebase listeners
      sessionUnsubscribes.current.forEach((unsub) => unsub());
      sessionUnsubscribes.current = [];
      
      // Stop location tracking
      stopLocationTracking();
      
      if (webrtcManager.current) {
        webrtcManager.current.stopLocalStream();
        webrtcManager.current.close();
      }

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = null;
      }

      // Update session status
      if (currentSession) {
        const sessionRef = ref(database, `sessions/${currentSession.sessionId}`);
        await update(sessionRef, {
          ...currentSession,
          status: 'ended',
          endedAt: Date.now()
        });

        // Remove from police alerts
        const alertsRef = ref(database, 'policeAlerts');
        const snapshot = await new Promise((resolve) => {
          onValue(alertsRef, (data) => resolve(data.val()));
        });
        
        if (snapshot) {
          Object.entries(snapshot).forEach(([id, alert]: [string, any]) => {
            if (alert.sessionId === currentSession.sessionId && alert.status === 'active') {
              const alertRef = ref(database, `policeAlerts/${id}`);
              update(alertRef, { status: 'ended', endedAt: Date.now() });
            }
          });
        }
      }

      setIsStreaming(false);
      setCurrentSession(null);
      
      console.log('✅ Emergency session ended and cleaned up');
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
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-pink-50 to-purple-50 safe-area-top safe-area-bottom">
      <div className="desktop-container">
        {/* Header */}
        <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-sm border-b border-gray-200 safe-area-top">
          <div className="desktop-flex justify-between items-center py-6 gap-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-gradient-to-r from-red-500 to-pink-500 rounded-full flex items-center justify-center shadow-lg">
                <Shield className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-2xl lg:text-3xl xl:text-4xl font-bold bg-gradient-to-r from-red-600 to-pink-600 bg-clip-text text-transparent">
                  Dashboard
                </h1>
                <p className="text-sm lg:text-base text-gray-600">Women Safety System</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <ThemeToggle />
              <Button 
                onClick={handleLogout} 
                variant="outline" 
                className="flex items-center gap-2 h-12 px-6 text-base"
              >
                <LogOut className="w-5 h-5" />
                Logout
              </Button>
            </div>
          </div>
        </header>

        {/* Location Info */}
        {(location || address) && (
          <Card className="mt-8 shadow-sm border-0 bg-white/80 backdrop-blur-sm">
            <CardContent className="desktop-padding">
              <div className="space-y-3">
                <div className="flex items-center gap-4 text-base text-gray-600">
                  <MapPin className="w-6 h-6 text-red-500 flex-shrink-0" />
                  <span className="font-mono text-sm">
                    Coordinates: {location?.lat.toFixed(6)}, {location?.lng.toFixed(6)}
                  </span>
                </div>
                {address && (
                  <div className="flex items-start gap-4 text-base text-gray-700">
                    <MapPin className="w-6 h-6 text-blue-500 flex-shrink-0 mt-1" />
                    <div>
                      <p className="text-sm font-medium text-gray-600">Current Address:</p>
                      <p className="text-sm">{address}</p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Main Content - Desktop Optimized Layout */}
        <div className="mt-8">
          {/* Video Stream and Chat Layout */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
            {/* Video Stream - Takes 2/3 space on desktop */}
            <div className="xl:col-span-2 space-y-6">
              <Card className="shadow-lg border-0 bg-white/90 backdrop-blur-sm">
                <CardHeader className="pb-6">
                  <CardTitle className="flex items-center gap-3 text-xl lg:text-2xl">
                    <Video className="w-6 h-6 text-red-500" />
                    Live Stream
                  </CardTitle>
                  <CardDescription className="text-base">
                    {isStreaming ? "Your live video is being streamed to emergency services" : "Click SOS to start streaming"}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="relative bg-black rounded-xl overflow-hidden aspect-video">
                    <video
                      ref={localVideoRef}
                      autoPlay
                      muted
                      playsInline
                      className="w-full h-full object-cover"
                    />
                    {!isStreaming && (
                      <div className="absolute inset-0 flex items-center justify-center bg-gray-900/90 backdrop-blur-sm">
                        <div className="text-center text-white">
                          <VideoOff className="w-20 h-20 mx-auto mb-6 opacity-50" />
                          <p className="text-xl lg:text-2xl font-medium">Camera not active</p>
                          <p className="text-base opacity-75 mt-2">Press SOS to start emergency stream</p>
                        </div>
                      </div>
                    )}
                    {isStreaming && (
                      <div className="absolute top-6 right-6">
                        <Badge variant="destructive" className="animate-pulse px-4 py-2 text-sm font-bold">
                          ● LIVE
                        </Badge>
                      </div>
                    )}
                  </div>

                  {/* Video Controls - Desktop Layout */}
                  {isStreaming && (
                    <div className="flex justify-center gap-4">
                      <Button
                        onClick={toggleMute}
                        variant="outline"
                        className="flex items-center gap-3 h-12 px-6 text-base"
                      >
                        {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                        {isMuted ? 'Unmute' : 'Mute'}
                      </Button>
                      <Button
                        onClick={toggleVideo}
                        variant="outline"
                        className="flex items-center gap-3 h-12 px-6 text-base"
                      >
                        {isVideoOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
                        {isVideoOff ? 'Video On' : 'Video Off'}
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Chat System - Below Video */}
              {currentSession && (
                <ChatSystem sessionId={currentSession.sessionId} userRole="victim" />
              )}
            </div>

            {/* Emergency Section - Sidebar on desktop */}
            <div className="space-y-6">
              {/* Panic Button */}
              <PanicButton 
                onActivate={startSOS}
                isActivated={isStreaming}
                disabled={isStreaming}
              />

              {/* Session Info */}
              {currentSession && (
                <Card className="shadow-lg border-0 bg-white/90 backdrop-blur-sm">
                  <CardHeader className="pb-4">
                    <CardTitle className="flex items-center gap-3 text-lg text-red-600">
                      <AlertTriangle className="w-5 h-5" />
                      Active Emergency Session
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center gap-2">
                      <Badge variant="destructive" className="animate-pulse px-3 py-1 text-sm font-bold">
                        ● EMERGENCY ACTIVE
                      </Badge>
                    </div>
                    <div className="grid grid-cols-1 gap-4 text-sm">
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <span className="text-gray-600 text-xs font-medium">Session ID:</span>
                        <p className="font-mono text-xs mt-2 break-all">{currentSession.sessionId}</p>
                      </div>
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <span className="text-gray-600 text-xs font-medium">Status:</span>
                        <p className="font-medium capitalize text-base">{currentSession.status}</p>
                      </div>
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <span className="text-gray-600 text-xs font-medium">Started:</span>
                        <p className="text-sm">{new Date(currentSession.timestamp).toLocaleString()}</p>
                      </div>
                    </div>
                    <div className="flex justify-center pt-4">
                      <Button
                        onClick={stopSOS}
                        variant="outline"
                        className="flex items-center gap-3 h-12 px-8 bg-red-50 border-red-200 text-red-600 hover:bg-red-100 hover:border-red-300 text-base"
                      >
                        <Phone className="w-5 h-5" />
                        End Emergency
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Emergency Contacts */}
              <EmergencyContacts />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
