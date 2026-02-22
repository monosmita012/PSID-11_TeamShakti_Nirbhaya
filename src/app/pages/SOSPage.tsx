import { useState, useEffect, useRef } from "react";
import { AlertTriangle, Video, Mic, MicOff, VideoOff, MapPin, Phone, Shield, X } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { getAuth } from "firebase/auth";
import { ref, set, push, serverTimestamp, update, get } from "firebase/database";
import { database } from "../firebase-config";
import { WebRTCManager } from "../components/WebRTCManager";
import { useNavigate } from "react-router";

export default function SOSPage() {
  const navigate = useNavigate();
  const auth = getAuth();
  const [isStreaming, setIsStreaming] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [caseId, setCaseId] = useState<string>("");
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const webrtcManager = useRef<WebRTCManager | null>(null);

  useEffect(() => {
    getCurrentLocation();
  }, []);

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (error) => {
          console.error("Error getting location:", error);
          // Fallback to default location
          setLocation({ lat: 40.7128, lng: -74.0060 }); // New York
        }
      );
    }
  };

  const startSOS = async () => {
    try {
      if (!auth.currentUser) {
        navigate('/auth');
        return;
      }

      setIsConnecting(true);

      // Generate unique case ID
      const newCaseId = `case_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      setCaseId(newCaseId);

      // Get user profile for case information
      const userRef = ref(database, `users/${auth.currentUser.uid}`);
      const userSnapshot = await get(userRef);
      const userData = userSnapshot.val();

      // Initialize WebRTC
      webrtcManager.current = new WebRTCManager();
      const stream = await webrtcManager.current.startLocalStream();
      
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
      
      const offer = await webrtcManager.current.createOffer();

      // Create case in Firebase
      const caseData = {
        caseId: newCaseId,
        victimId: auth.currentUser.uid,
        victimName: userData?.name || "Unknown",
        victimPhone: userData?.phone || "Unknown",
        guardianName: userData?.guardianName || "Unknown",
        guardianPhone: userData?.guardianPhone || "Unknown",
        address: userData?.address || "Unknown",
        lat: location?.lat || 40.7128,
        lng: location?.lng || -74.0060,
        status: "active",
        timestamp: serverTimestamp(),
        offer: offer
      };

      await set(ref(database, `cases/${newCaseId}`), caseData);

      // Send emergency message to guardian
      if (userData?.guardianPhone) {
        const emergencyMessage = `EMERGENCY: ${userData.name} is in danger! Location: https://www.google.com/maps?q=${location?.lat},${location?.lng}`;
        // In production, integrate SMS service here
        console.log("Emergency message sent:", emergencyMessage);
      }

      setIsStreaming(true);
      setIsConnecting(false);
    } catch (error) {
      console.error("Error starting SOS:", error);
      setIsConnecting(false);
      alert("Failed to start emergency stream. Please check camera and microphone permissions.");
    }
  };

  const stopSOS = async () => {
    try {
      if (webrtcManager.current) {
        webrtcManager.current.close();
      }
      
      if (localVideoRef.current) {
        const stream = localVideoRef.current.srcObject as MediaStream;
        stream?.getTracks().forEach(track => track.stop());
        localVideoRef.current.srcObject = null;
      }

      // Update case status
      if (caseId) {
        await update(ref(database, `cases/${caseId}`), {
          status: "resolved",
          resolvedAt: serverTimestamp()
        });
      }

      setIsStreaming(false);
      setCaseId("");
    } catch (error) {
      console.error("Error stopping SOS:", error);
    }
  };

  const toggleMute = () => {
    if (webrtcManager.current) {
      webrtcManager.current.toggleMute();
      setIsMuted(!isMuted);
    }
  };

  const toggleVideo = () => {
    if (webrtcManager.current) {
      webrtcManager.current.toggleVideo();
      setIsVideoOff(!isVideoOff);
    }
  };

  const getMapsLink = () => {
    if (!location) return "#";
    return `https://www.google.com/maps?q=${location.lat},${location.lng}`;
  };

  const callEmergencyServices = () => {
    window.open('tel:911', '_self');
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
              <h1 className="text-2xl font-bold text-gray-900">Emergency SOS</h1>
              <p className="text-sm text-gray-600">Women Safety System</p>
            </div>
          </div>
          <Button 
            onClick={() => navigate('/victim-profile')}
            variant="outline"
            className="flex items-center gap-2"
          >
            <Shield className="w-4 h-4" />
            Profile
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Live Video Stream */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Video className="w-5 h-5" />
                Live Stream
              </CardTitle>
              <CardDescription>
                {isStreaming 
                  ? "Your emergency video is being streamed live to emergency services" 
                  : "Click the SOS button to start emergency streaming"
                }
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

              {/* Stream Controls */}
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

          {/* SOS Control Panel */}
          <div className="space-y-6">
            {/* SOS Button */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                  Emergency Control
                </CardTitle>
                <CardDescription>
                  {isStreaming 
                    ? "Emergency services have been notified" 
                    : "Press the SOS button to activate emergency services"
                  }
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col items-center justify-center space-y-6">
                {!isStreaming ? (
                  <Button
                    onClick={startSOS}
                    size="lg"
                    className="w-48 h-48 rounded-full bg-red-600 hover:bg-red-700 text-white text-xl font-bold animate-pulse flex flex-col items-center justify-center"
                    disabled={isConnecting}
                  >
                    {isConnecting ? (
                      <>
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mb-2"></div>
                        <span>Connecting...</span>
                      </>
                    ) : (
                      <>
                        <AlertTriangle className="w-16 h-16 mb-2" />
                        <span>SOS</span>
                      </>
                    )}
                  </Button>
                ) : (
                  <div className="text-center space-y-4">
                    <Badge variant="destructive" className="text-lg px-6 py-3">
                      EMERGENCY ACTIVE
                    </Badge>
                    <p className="text-sm text-gray-600">
                      Your location and video are being shared with emergency services
                    </p>
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Case ID: {caseId}</p>
                      <p className="text-sm text-gray-600">
                        Started: {new Date().toLocaleString()}
                      </p>
                    </div>
                    <Button
                      onClick={stopSOS}
                      variant="outline"
                      className="flex items-center gap-2"
                    >
                      <X className="w-4 h-4" />
                      End Emergency
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Location Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="w-5 h-5" />
                  Current Location
                </CardTitle>
                <CardDescription>
                  Your GPS location for emergency services
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

            {/* Emergency Contacts */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Phone className="w-5 h-5" />
                  Emergency Services
                </CardTitle>
                <CardDescription>
                  Quick access to emergency services
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <Button
                    onClick={callEmergencyServices}
                    className="w-full bg-red-600 hover:bg-red-700 flex items-center gap-2"
                  >
                    <Phone className="w-4 h-4" />
                    Call 911 Emergency
                  </Button>
                  <div className="text-center text-sm text-gray-600">
                    Available 24/7 for immediate assistance
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
