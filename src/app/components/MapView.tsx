import { useState, useEffect } from "react";
import { MapPin, Navigation, ExternalLink } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";

interface Location {
  lat: number;
  lng: number;
}

interface MapViewProps {
  location: Location | null;
  sessionId?: string;
  victimId?: string;
}

export default function MapView({ location, sessionId, victimId }: MapViewProps) {
  const [mapUrl, setMapUrl] = useState<string>("");
  const [staticMapUrl, setStaticMapUrl] = useState<string>("");

  useEffect(() => {
    if (location) {
      // Generate Google Maps URL
      const mapsUrl = `https://www.google.com/maps?q=${location.lat},${location.lng}&z=15`;
      setMapUrl(mapsUrl);

      // Generate static map image URL (using a free service)
      const staticUrl = `https://maps.googleapis.com/maps/api/staticmap?center=${location.lat},${location.lng}&zoom=15&size=600x300&markers=color:red%7C${location.lat},${location.lng}&key=YOUR_API_KEY`;
      
      // Use OpenStreetMap tile (staticmap.openstreetmap.de often has DNS issues)
      const z = 14;
      const x = Math.floor(((location.lng + 180) / 360) * Math.pow(2, z));
      const y = Math.floor(((1 - Math.log(Math.tan((location.lat * Math.PI) / 180) + 1 / Math.cos((location.lat * Math.PI) / 180)) / Math.PI) / 2) * Math.pow(2, z));
      const tileUrl = `https://tile.openstreetmap.org/${z}/${x}/${y}.png`;
      setStaticMapUrl(tileUrl);
    }
  }, [location]);

  const openInMaps = () => {
    if (mapUrl) {
      window.open(mapUrl, '_blank');
    }
  };

  const getDirections = () => {
    if (location) {
      const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${location.lat},${location.lng}`;
      window.open(directionsUrl, '_blank');
    }
  };

  const formatCoordinates = (lat: number, lng: number) => {
    return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
  };

  if (!location) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5" />
            Location
          </CardTitle>
          <CardDescription>
            Victim location not available
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            <MapPin className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>No location data available</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="w-5 h-5" />
          Victim Location
        </CardTitle>
        <CardDescription>
          Real-time location tracking
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Map Preview */}
        <div className="relative rounded-lg overflow-hidden border">
          <img
            src={staticMapUrl}
            alt="Location map"
            className="w-full h-48 object-cover"
            onError={(e) => {
              // Fallback if image fails to load
              e.currentTarget.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='600' height='300'%3E%3Crect width='600' height='300' fill='%23f3f4f6'/%3E%3Ctext x='50%25' y='50%25' text-anchor='middle' dy='.3em' fill='%236b7280' font-family='sans-serif' font-size='16'%3EMap Preview Unavailable%3C/text%3E%3C/svg%3E";
            }}
          />
          <div className="absolute top-2 right-2">
            <Badge variant="secondary" className="text-xs">
              LIVE
            </Badge>
          </div>
          <div className="absolute bottom-2 left-2 bg-white rounded px-2 py-1 shadow-sm">
            <div className="flex items-center gap-1">
              <MapPin className="w-3 h-3 text-red-600" />
              <span className="text-xs font-medium">Victim Location</span>
            </div>
          </div>
        </div>

        {/* Location Details */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">Coordinates:</span>
            <code className="text-xs bg-gray-100 px-2 py-1 rounded">
              {formatCoordinates(location.lat, location.lng)}
            </code>
          </div>
          
          {sessionId && (
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">Session ID:</span>
              <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                {sessionId.slice(-8)}
              </code>
            </div>
          )}

          {victimId && (
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">Victim ID:</span>
              <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                {victimId.slice(-8)}
              </code>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button
            onClick={openInMaps}
            variant="outline"
            size="sm"
            className="flex-1 flex items-center gap-2"
          >
            <ExternalLink className="w-4 h-4" />
            Open in Maps
          </Button>
          <Button
            onClick={getDirections}
            variant="outline"
            size="sm"
            className="flex-1 flex items-center gap-2"
          >
            <Navigation className="w-4 h-4" />
            Get Directions
          </Button>
        </div>

        {/* Location Accuracy Info */}
        <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded">
          <p>📍 Location accuracy may vary based on device GPS</p>
          <p>🕐 Last updated: Real-time</p>
        </div>
      </CardContent>
    </Card>
  );
}
