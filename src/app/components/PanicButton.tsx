import { useState, useEffect, useRef } from "react";
import { AlertTriangle, Smartphone, Volume2 } from "lucide-react";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";

interface PanicButtonProps {
  onActivate: () => void;
  isActivated: boolean;
  disabled?: boolean;
}

export default function PanicButton({ onActivate, isActivated, disabled = false }: PanicButtonProps) {
  const [isPressed, setIsPressed] = useState(false);
  const [vibrationSupported, setVibrationSupported] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const audioContext = useRef<AudioContext | null>(null);
  const oscillator = useRef<OscillatorNode | null>(null);

  useEffect(() => {
    // Check if vibration API is supported
    setVibrationSupported('vibrate' in navigator);
    
    // Initialize audio context for sound
    if (typeof window !== 'undefined' && !audioContext.current) {
      audioContext.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
  }, []);

  const playAlertSound = () => {
    if (!soundEnabled || !audioContext.current) return;

    try {
      // Create oscillator for alert sound
      const osc = audioContext.current.createOscillator();
      const gainNode = audioContext.current.createGain();
      
      osc.connect(gainNode);
      gainNode.connect(audioContext.current.destination);
      
      osc.frequency.value = 800; // Alert frequency
      osc.type = 'sine';
      
      gainNode.gain.setValueAtTime(0.3, audioContext.current.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.current.currentTime + 0.5);
      
      osc.start(audioContext.current.currentTime);
      osc.stop(audioContext.current.currentTime + 0.5);
      
      oscillator.current = osc;
    } catch (error) {
      console.log('Audio playback failed:', error);
    }
  };

  const triggerVibration = () => {
    if (!vibrationSupported) return;

    // Vibration pattern: strong vibration, short pause, repeat
    const pattern = [200, 100, 200, 100, 200];
    
    try {
      navigator.vibrate(pattern);
    } catch (error) {
      console.log('Vibration failed:', error);
    }
  };

  const handlePanicActivate = () => {
    if (disabled || isActivated) return;

    setIsPressed(true);
    triggerVibration();
    playAlertSound();
    
    // Multiple vibrations for emphasis
    if (vibrationSupported) {
      setTimeout(() => triggerVibration(), 300);
      setTimeout(() => triggerVibration(), 600);
    }

    // Multiple alert sounds
    if (soundEnabled) {
      setTimeout(() => playAlertSound(), 300);
      setTimeout(() => playAlertSound(), 600);
    }

    onActivate();

    // Reset button state after animation
    setTimeout(() => setIsPressed(false), 1000);
  };

  const testVibration = () => {
    if (vibrationSupported) {
      navigator.vibrate([100, 50, 100]);
    }
  };

  const testSound = () => {
    playAlertSound();
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-red-600" />
          Emergency Panic Button
        </CardTitle>
        <CardDescription>
          Press and hold for 1 second to activate emergency services
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Panic Button */}
        <div className="flex justify-center">
          <Button
            onClick={handlePanicActivate}
            disabled={disabled || isActivated}
            size="lg"
            className={`
              relative w-40 h-40 rounded-full text-white font-bold text-xl
              transition-all duration-200 transform
              ${isActivated 
                ? 'bg-red-800 cursor-not-allowed' 
                : disabled
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-red-600 hover:bg-red-700 hover:scale-105 active:scale-95'
              }
              ${isPressed ? 'animate-pulse ring-4 ring-red-300' : ''}
            `}
          >
            <div className="flex flex-col items-center gap-2">
              {isActivated ? (
                <>
                  <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-sm">ACTIVE</span>
                </>
              ) : (
                <>
                  <AlertTriangle className="w-12 h-12" />
                  <span>PANIC</span>
                </>
              )}
            </div>
          </Button>
        </div>

        {/* Status Indicators */}
        <div className="flex justify-center gap-4">
          <div className="flex items-center gap-2">
            <Smartphone className="w-4 h-4 text-gray-400" />
            <Badge variant={vibrationSupported ? "default" : "secondary"} className="text-xs">
              Vibration {vibrationSupported ? "Enabled" : "Not Supported"}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <Volume2 className="w-4 h-4 text-gray-400" />
            <Badge variant={soundEnabled ? "default" : "secondary"} className="text-xs">
              Sound {soundEnabled ? "Enabled" : "Disabled"}
            </Badge>
          </div>
        </div>

        {/* Test Controls */}
        <div className="border-t pt-4">
          <p className="text-sm text-gray-600 mb-3">Test Emergency Features:</p>
          <div className="flex gap-2 justify-center">
            <Button
              onClick={testVibration}
              variant="outline"
              size="sm"
              disabled={!vibrationSupported}
              className="flex items-center gap-2"
            >
              <Smartphone className="w-4 h-4" />
              Test Vibration
            </Button>
            <Button
              onClick={testSound}
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
            >
              <Volume2 className="w-4 h-4" />
              Test Sound
            </Button>
            <Button
              onClick={() => setSoundEnabled(!soundEnabled)}
              variant="outline"
              size="sm"
            >
              {soundEnabled ? "Mute" : "Unmute"}
            </Button>
          </div>
        </div>

        {/* Instructions */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
          <h4 className="font-medium text-yellow-800 mb-2">Emergency Instructions:</h4>
          <ul className="text-sm text-yellow-700 space-y-1">
            <li>• Press the PANIC button to immediately activate emergency services</li>
            <li>• Your location and live video will be shared with police</li>
            <li>• Emergency contacts will be notified</li>
            <li>• Stay calm and follow police instructions via chat</li>
            {vibrationSupported && <li>• Phone will vibrate to confirm activation</li>}
          </ul>
        </div>

        {/* Mobile Detection */}
        <div className="text-center text-xs text-gray-500">
          {/Mobi|Android/i.test(navigator.userAgent) 
            ? "📱 Mobile device detected - Full emergency features available"
            : "🖥️ Desktop device - Some mobile features limited"
          }
        </div>
      </CardContent>
    </Card>
  );
}
