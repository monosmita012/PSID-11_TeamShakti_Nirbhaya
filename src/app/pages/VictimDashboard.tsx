import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router";
import { Shield, Video, VideoOff, Mic, MicOff, Phone, AlertTriangle, MapPin, LogOut, User } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { signOut, getAuth } from "firebase/auth";
import { ref, push, set, onValue, serverTimestamp, update, get } from "firebase/database";
import { database } from "../firebase-config";
import { WebRTCManager } from "../components/WebRTCManager";
import { smsService } from "../services/smsService";
import { cloudinaryVideoService } from "../services/cloudinaryVideoService";
import { policeStationService, PoliceStation } from "../services/policeStationService";
import SOSButton from "../components/PanicButton";
import ChatSystem from "../components/ChatSystem";
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
  const [isRecording, setIsRecording] = useState(false);
  const [recordedVideoUrl, setRecordedVideoUrl] = useState<string | null>(null);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [nearestStations, setNearestStations] = useState<PoliceStation[]>([]);
  const [guardianPhone, setGuardianPhone] = useState<string>("");
  
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
      
      // Find nearest police stations
      policeStationService.findNearestStations(loc.lat, loc.lng).then((stations) => {
        setNearestStations(stations);
      }).catch(console.error);
    }).catch(console.error);

    // Fetch guardian phone
    fetchGuardianPhone();

    return () => {
      stopLocationTracking();
    };
  }, []);

  // Fetch guardian phone from Firebase
  const fetchGuardianPhone = async () => {
    if (!auth.currentUser) return;
    try {
      const userRef = ref(database, `users/${auth.currentUser.uid}`);
      const snapshot = await get(userRef);
      const data = snapshot.val();
      
      if (data?.guardianPhone) {
        setGuardianPhone(data.guardianPhone);
      }
    } catch (error) {
      console.error("Error fetching guardian phone:", error);
    }
  };

  // Call guardian directly
  const callGuardian = () => {
    if (guardianPhone) {
      window.open(`tel:${guardianPhone}`, '_self');
    } else {
      alert("No guardian phone number found. Please add a guardian in your profile.");
    }
  };

  const startSOS = async () => {
    try {
      // Get current location with address
      const currentLocation = await getCurrentLocation();
      setLocation(currentLocation);
      if (currentLocation.address) {
        setAddress(currentLocation.address);
      }

      // Initialize WebRTC
      webrtcManager.current = new WebRTCManager();
      
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

      // Send SMS alerts to guardians AUTOMATICALLY from Firebase
      console.log('📱 Sending SMS alerts to guardians...');
      const smsResult = await smsService.sendToGuardians(currentLocation);
      
      if (smsResult.success) {
        console.log(`✅ SMS alerts sent to ${smsResult.sent} guardian(s)`);
        
        // Show success popup
        alert(`🚨 SMS SENT SUCCESSFULLY!\n\nEmergency alert with your live location has been sent to ${smsResult.sent} guardian(s).\n\n✅ Guardians will receive:\n• Your name\n• Live location link\n• Current address\n• Time of emergency\n\n📞 Help is on the way!`);
      } else {
        console.warn('⚠️ Could not send SMS alerts:', smsResult.details);
        // SMS failure popup removed - continue with emergency flow
      }

      // Start video recording for evidence
      console.log('🎥 Starting video recording for evidence...');
      setIsRecording(true);
      try {
        await cloudinaryVideoService.startRecording();
        console.log('✅ Video recording started');
      } catch (error) {
        console.error('❌ Failed to start video recording:', error);
        setIsRecording(false);
      }

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

        // Stop video recording and upload to Cloudinary
        if (isRecording) {
          console.log('🛑 Stopping video recording and uploading...');
          setIsRecording(false);
          setUploadingVideo(true);
          
          try {
            const videoUrl = await cloudinaryVideoService.stopRecording();
            setRecordedVideoUrl(videoUrl);
            
            // Get video blob and upload to Cloudinary
            const videoBlob = await cloudinaryVideoService.getVideoBlob(videoUrl);
            const cloudinaryUrl = await cloudinaryVideoService.uploadToCloudinary(videoBlob, currentSession.sessionId);
            
            // Update session with video URL
            await update(sessionRef, {
              videoRecording: cloudinaryUrl,
              videoUploadedAt: Date.now()
            });
            
            console.log('✅ Video uploaded to Cloudinary:', cloudinaryUrl);
            alert('🎥 Video evidence uploaded successfully!');
            
          } catch (error) {
            console.error('❌ Failed to upload video:', error);
            alert('⚠️ Video upload failed, but emergency services have been notified.');
          } finally {
            setUploadingVideo(false);
          }
        }

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

  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate('/auth');
    } catch (error) {
      console.error('Error signing out:', error);
    }
    setShowLogoutConfirm(false);
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
                  Nirbhaya App
                </h1>
                <p className="text-sm lg:text-base text-gray-600">Women Safety System</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Button
                onClick={() => navigate('/profile')}
                variant="outline"
                className="flex items-center gap-2 h-12 px-6 text-base border-pink-300 text-pink-600 hover:bg-pink-50"
              >
                <User className="w-5 h-5" />
                Profile
              </Button>
              <Button 
                onClick={() => setShowLogoutConfirm(true)} 
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

        {/* Nearest Police Station */}
        {nearestStations.length > 0 && (
          <Card className="mt-6 shadow-sm border-0 bg-white/80 backdrop-blur-sm">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-3 text-lg text-blue-600">
                <Shield className="w-5 h-5" />
                Nearest Police Station
              </CardTitle>
              <CardDescription className="text-sm">
                Quick access to emergency services
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {nearestStations.slice(0, 1).map((station, index) => (
                <div key={index} className="p-4 border rounded-lg bg-blue-50 border-blue-200">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1">
                      <h4 className="font-semibold text-blue-900 text-lg">{station.name}</h4>
                      <p className="text-sm text-gray-600 mt-1">{station.address}</p>
                    </div>
                    <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-800">
                      {station.distance.toFixed(1)} km
                    </Badge>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 text-sm text-green-600">
                      <Phone className="w-4 h-4" />
                      <span className="font-medium">{station.phone}</span>
                    </div>
                    <Button
                      onClick={() => {
                        if (location) {
                          const directionsUrl = policeStationService.getDirections(station, location.lat, location.lng);
                          window.open(directionsUrl, '_blank');
                        }
                      }}
                      variant="outline"
                      size="sm"
                      className="flex items-center gap-2 text-blue-600 border-blue-300 hover:bg-blue-50"
                    >
                      <MapPin className="w-4 h-4" />
                      Get Directions
                    </Button>
                  </div>
                </div>
              ))}
              {nearestStations.length > 1 && (
                <div className="text-center">
                  <Button
                    onClick={() => {
                      const element = document.querySelector('.police-stations-full-list');
                      if (element) {
                        element.scrollIntoView({ behavior: 'smooth' });
                      }
                    }}
                    variant="ghost"
                    size="sm"
                    className="text-blue-600 hover:text-blue-700"
                  >
                    View all {nearestStations.length} stations →
                  </Button>
                </div>
              )}
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
                    {isRecording && (
                      <div className="mt-2 flex items-center gap-2 text-red-600">
                        <div className="w-3 h-3 bg-red-600 rounded-full animate-pulse"></div>
                        <span className="text-sm font-medium">🎥 Recording video evidence...</span>
                      </div>
                    )}
                    {uploadingVideo && (
                      <div className="mt-2 flex items-center gap-2 text-blue-600">
                        <div className="w-3 h-3 bg-blue-600 rounded-full animate-spin"></div>
                        <span className="text-sm font-medium">☁️ Uploading video to cloud...</span>
                      </div>
                    )}
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
              {/* SOS Button */}
              <SOSButton 
                onActivate={startSOS}
                isActivated={isStreaming}
                disabled={isStreaming}
              />

              {/* Call Guardian Button */}
              <Card className="shadow-lg border-0 bg-white/90 backdrop-blur-sm">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-3 text-lg text-green-600">
                    <Phone className="w-5 h-5" />
                    Call Guardian
                  </CardTitle>
                  <CardDescription>
                    Direct call to your primary guardian
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button
                    onClick={callGuardian}
                    className="w-full flex items-center gap-2 h-12 bg-green-600 hover:bg-green-700 text-white"
                    size="lg"
                  >
                    <Phone className="w-5 h-5" />
                    {guardianPhone ? `Call ${guardianPhone}` : 'Call Guardian'}
                  </Button>
                  {!guardianPhone && (
                    <p className="text-xs text-gray-500 mt-2 text-center">
                      Add guardian phone number in profile to enable direct calling
                    </p>
                  )}
                </CardContent>
              </Card>

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
            </div>
          </div>
        </div>

        {/* Nearest Police Stations Section */}
        {nearestStations.length > 0 && (
          <div className="mt-8 police-stations-full-list">
            <Card className="shadow-lg border-0 bg-white/90 backdrop-blur-sm">
              <CardHeader className="pb-6">
                <CardTitle className="flex items-center gap-3 text-xl lg:text-2xl">
                  <Shield className="w-6 h-6 text-blue-500" />
                  Nearest Police Stations
                </CardTitle>
                <CardDescription className="text-base">
                  Click on any police station to get directions
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {nearestStations.map((station, index) => (
                    <Card 
                      key={index} 
                      className="cursor-pointer hover:shadow-md transition-shadow border border-blue-200 bg-blue-50/50"
                      onClick={() => {
                        if (location) {
                          const directionsUrl = policeStationService.getDirections(station, location.lat, location.lng);
                          window.open(directionsUrl, '_blank');
                        }
                      }}
                    >
                      <CardContent className="p-4">
                        <div className="space-y-2">
                          <div className="flex items-start justify-between">
                            <h4 className="font-semibold text-blue-900">{station.name}</h4>
                            <Badge variant="secondary" className="text-xs">
                              {station.distance.toFixed(1)} km
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-600 line-clamp-2">{station.address}</p>
                          <div className="flex items-center gap-2 text-sm">
                            <Phone className="w-4 h-4 text-green-600" />
                            <span className="font-medium text-green-600">{station.phone}</span>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-blue-600">
                            <MapPin className="w-3 h-3" />
                            <span>Click for directions</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
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
