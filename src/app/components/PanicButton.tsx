import { useState } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";

interface SOSButtonProps {
  onActivate: () => void;
  isActivated: boolean;
  disabled?: boolean;
}

export default function SOSButton({ onActivate, isActivated, disabled = false }: SOSButtonProps) {
  const [isPressed, setIsPressed] = useState(false);

  const handleSOSActivate = () => {
    if (disabled || isActivated) return;

    setIsPressed(true);
    onActivate();

    // Reset button state after animation
    setTimeout(() => setIsPressed(false), 1000);
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-red-600" />
          Emergency SOS Button
        </CardTitle>
        <CardDescription>
          Press to activate emergency services immediately
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* SOS Button */}
        <div className="flex justify-center">
          <Button
            onClick={handleSOSActivate}
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
                  <span>SOS</span>
                </>
              )}
            </div>
          </Button>
        </div>

        {/* Instructions */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
          <h4 className="font-medium text-yellow-800 mb-2">Emergency Instructions:</h4>
          <ul className="text-sm text-yellow-700 space-y-1">
            <li>• Press the SOS button to immediately activate emergency services</li>
            <li>• Your location and live video will be shared with police</li>
            <li>• Stay calm and follow police instructions via chat</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
